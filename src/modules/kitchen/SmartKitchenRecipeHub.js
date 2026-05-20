import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import "./SmartKitchenRecipeHub.css";

const BASE_TABS = [
  { id: "home", label: "Quick Cook" },
  { id: "generator", label: "AI Recipe" },
  { id: "details", label: "Recipe" },
  { id: "cooking", label: "Cooking Mode" },
  { id: "grocery", label: "Grocery" },
  { id: "mealplan", label: "Meal Plan" },
  { id: "tips", label: "Tips" },
  { id: "community", label: "Community" },
];

const ADMIN_TAB = { id: "admin", label: "Admin" };

const VOICE_COMMAND_HINTS = [
  "start cooking / പാചകം തുടങ്ങൂ",
  "next step / അടുത്ത ഘട്ടം",
  "repeat step / വീണ്ടും പറയൂ",
  "grocery list / സാധനങ്ങളുടെ ലിസ്റ്റ്",
  "tips / ടിപ്സ്",
  "ingredients ... / ചേരുവകൾ ...",
  "allergies ... / അലർജി ...",
  "generate recipe / റെസിപ്പി ഉണ്ടാക്കൂ",
];

const mlIncludes = (text, phrases) => phrases.some((phrase) => text.includes(phrase));

const parseJwtPayload = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch (_error) {
    return null;
  }
};

const hasAdminRole = (token) => {
  const payload = parseJwtPayload(token);
  const rawRoles = [
    payload?.role,
    payload?.userRole,
    ...(Array.isArray(payload?.roles) ? payload.roles : []),
    ...(Array.isArray(payload?.permissions) ? payload.permissions : []),
  ];
  return rawRoles
    .map((item) => String(item || "").toLowerCase().trim())
    .some((role) => role === "admin" || role === "superadmin" || role === "finance_admin");
};

const buildWhatsAppGroceryLink = (groceryData = {}, recipeTitle = "Recipe") => {
  const items = groceryData.items || groceryData.groceryList?.items || [];
  const missingItems = groceryData.missingItems?.length
    ? groceryData.missingItems
    : items.filter((item) => !item.availableAtHome);
  const rows = missingItems.length ? missingItems : items;
  const message = [
    `Grocery list for ${recipeTitle}`,
    ...rows.map((item, index) => `${index + 1}. ${item.name}${item.quantity ? ` - ${item.quantity}` : ""}`),
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
};

const SmartKitchenRecipeHub = () => {
  const token = getStoredAuthToken();
  const isAdmin = useMemo(
    () =>
      hasAdminRole(token) ||
      ["admin", "superadmin"].includes(String(localStorage.getItem("role") || "").toLowerCase()),
    [token]
  );
  const tabs = useMemo(() => (isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS), [isAdmin]);
  const [tab, setTab] = useState("home");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [busyKey, setBusyKey] = useState("");
  const [meta, setMeta] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [tips, setTips] = useState([]);
  const [todayTip, setTodayTip] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [grocery, setGrocery] = useState(null);
  const [recipeFinder, setRecipeFinder] = useState({ search: "", type: "All" });
  const [mealPlanForm, setMealPlanForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    breakfast: "",
    lunch: "",
    dinner: "",
    snacks: "",
    notes: "",
  });
  const [mealPlanGrocery, setMealPlanGrocery] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [pendingCommunity, setPendingCommunity] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantName, setAssistantName] = useState("Chef Nila");
  const [lastHeardCommand, setLastHeardCommand] = useState("");

  const recognitionRef = useRef(null);

  const [generatorForm, setGeneratorForm] = useState({
    ingredients: "rice, onion, egg",
    cuisine: "Indian",
    category: "Dinner",
    vegType: "egg",
    maxTimeMinutes: 20,
    language: "en",
    budgetMode: true,
    healthyMode: false,
    allergies: "nuts",
    leftoverItem: "rice",
  });

  const [communityForm, setCommunityForm] = useState({
    title: "",
    ingredients: "",
    steps: "",
    imageUrl: "",
  });

  const [cookingIndex, setCookingIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const request = useMemo(
    () =>
      axios.create({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    [token]
  );

  const withBusy = useCallback(async (key, fn) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey("");
    }
  }, []);

  const pushStatus = useCallback((type, text) => setStatus({ type, text }), []);

  const getVoiceLanguageCode = useCallback(() => {
    if (generatorForm.language === "ml") return "ml-IN";
    if (generatorForm.language === "hi") return "hi-IN";
    return "en-US";
  }, [generatorForm.language]);

  const speakText = useCallback(
    (text) => {
      const message = String(text || "").trim();
      if (!voiceEnabled || !window.speechSynthesis || !message) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = getVoiceLanguageCode();
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      const availableVoices = window.speechSynthesis.getVoices?.() || [];
      const bestVoice =
        availableVoices.find((voice) => voice.lang === utterance.lang) ||
        availableVoices.find((voice) => voice.lang?.startsWith(utterance.lang.split("-")[0])) ||
        null;
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      window.speechSynthesis.speak(utterance);
    },
    [getVoiceLanguageCode, voiceEnabled]
  );

  const loadMeta = useCallback(async () => {
    await withBusy("meta", async () => {
      try {
        const response = await request.get(buildApiUrl("/kitchen/meta"));
        setMeta(response.data);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load module metadata.");
      }
    });
  }, [pushStatus, request, withBusy]);

  const loadRecipes = useCallback(async () => {
    await withBusy("recipes", async () => {
      try {
        const response = await request.get(buildApiUrl("/kitchen/recipes"), {
          params: { limit: 24 },
        });
        setRecipes(response.data.recipes || []);
        if (!selectedRecipe && response.data.recipes?.length) {
          setSelectedRecipe(response.data.recipes[0]);
        }
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load recipes.");
      }
    });
  }, [pushStatus, request, selectedRecipe, withBusy]);

  const loadTips = useCallback(async () => {
    await withBusy("tips", async () => {
      try {
        const response = await request.get(buildApiUrl("/kitchen/tips"), {
          params: { language: "en" },
        });
        setTips(response.data.tips || []);
        setTodayTip(response.data.todayTip || null);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load tips.");
      }
    });
  }, [pushStatus, request, withBusy]);

  const loadRecipeDetail = useCallback(
    async (recipeId) => {
      if (!recipeId) return;
      await withBusy("recipe-detail", async () => {
        try {
          const response = await request.get(buildApiUrl(`/kitchen/recipes/${recipeId}`));
          setSelectedRecipe(response.data.recipe);
          setCookingIndex(0);
          setTimerSeconds(
            Number(response.data.recipe?.steps?.[0]?.timerSeconds || 0)
          );
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to load recipe detail.");
        }
      });
    },
    [pushStatus, request, withBusy]
  );

  const generateRecipe = useCallback(async (override = {}) => {
    await withBusy("generate", async () => {
      try {
        const form = { ...generatorForm, ...override };
        const payload = {
          ...form,
          ingredients: form.ingredients
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean),
          allergies: form.allergies
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean),
        };

        const response = await request.post(buildApiUrl("/kitchen/recipes/generate"), payload);
        setSelectedRecipe({
          ...(response.data.recipe || {}),
          allergyWarnings: response.data.allergyWarnings || response.data.recipe?.allergyWarnings || [],
        });
        setGrocery({
          items: response.data.groceryList || [],
          missingItems: (response.data.groceryList || []).filter((item) => !item.availableAtHome),
          share: response.data?.share,
        });
        pushStatus("success", "AI recipe generated successfully.");
        speakText(
          `Recipe ready. ${response.data.recipe?.title || "New recipe"} is prepared. You can say start cooking.`
        );
        setTab("details");
        loadRecipes();
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to generate AI recipe.");
      }
    });
  }, [generatorForm, loadRecipes, pushStatus, request, speakText, withBusy]);

  const saveRecipe = useCallback(async () => {
    if (!selectedRecipe?.id && !selectedRecipe?._id) return;
    await withBusy("save", async () => {
      try {
        await request.post(buildApiUrl("/kitchen/save-recipe"), {
          recipeId: selectedRecipe.id || selectedRecipe._id,
        });
        pushStatus("success", "Recipe saved.");
        loadRecipes();
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to save recipe.");
      }
    });
  }, [loadRecipes, pushStatus, request, selectedRecipe, withBusy]);

  const generateGroceryList = useCallback(async () => {
    if (!selectedRecipe?.id && !selectedRecipe?._id) return;
    await withBusy("grocery", async () => {
      try {
        const response = await request.post(buildApiUrl("/kitchen/grocery-list"), {
          recipeId: selectedRecipe.id || selectedRecipe._id,
          availableAtHome: [],
        });
        setGrocery(response.data);
        setTab("grocery");
        speakText("Grocery list is ready.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to create grocery list.");
      }
    });
  }, [pushStatus, request, selectedRecipe, speakText, withBusy]);

  const submitCommunityRecipe = useCallback(async () => {
    await withBusy("community-submit", async () => {
      try {
        await request.post(buildApiUrl("/kitchen/community-recipe"), {
          title: communityForm.title,
          ingredients: communityForm.ingredients
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean),
          steps: communityForm.steps
            .split(/\n+/)
            .map((item) => item.trim())
            .filter(Boolean),
          imageUrl: communityForm.imageUrl,
        });
        setCommunityForm({ title: "", ingredients: "", steps: "", imageUrl: "" });
        pushStatus("success", "Community recipe submitted for approval.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to submit community recipe.");
      }
    });
  }, [communityForm, pushStatus, request, withBusy]);

  const loadPendingCommunity = useCallback(async () => {
    await withBusy("pending", async () => {
      try {
        const response = await request.get(buildApiUrl("/kitchen/admin/pending-recipes"));
        setPendingCommunity(response.data.pending || []);
      } catch (_error) {
        setPendingCommunity([]);
      }
    });
  }, [request, withBusy]);

  const moderateCommunity = useCallback(
    async (id, nextStatus) => {
      await withBusy(`moderate-${id}`, async () => {
        try {
          await request.put(buildApiUrl(`/kitchen/admin/approve-recipe/${id}`), {
            status: nextStatus,
          });
          pushStatus("success", `Recipe ${nextStatus}.`);
          loadPendingCommunity();
          loadRecipes();
        } catch (error) {
          pushStatus("error", error?.response?.data?.message || "Failed to update recipe status.");
        }
      });
    },
    [loadPendingCommunity, loadRecipes, pushStatus, request, withBusy]
  );

  const currentStep = selectedRecipe?.steps?.[cookingIndex] || null;

  const processVoiceCommand = useCallback(
    (command) => {
      const raw = String(command || "").trim();
      if (!raw) return;
      const lower = raw.toLowerCase();
      setLastHeardCommand(raw);

      if (lower.includes("start cooking") || mlIncludes(raw, ["പാചകം തുടങ്ങൂ", "കുക്കിംഗ് തുടങ്ങൂ", "തുടങ്ങൂ"])) {
        setTab("cooking");
        if (selectedRecipe?.steps?.length) {
          setCookingIndex(0);
          setTimerSeconds(Number(selectedRecipe.steps?.[0]?.timerSeconds || 0));
          speakText(selectedRecipe.steps?.[0]?.instruction || "Cooking mode started.");
        } else {
          speakText("Please open a recipe first.");
        }
        return;
      }

      if (lower.includes("next step") || lower === "next" || lower.includes("next") || mlIncludes(raw, ["അടുത്ത ഘട്ടം", "അടുത്തത്", "നെക്സ്റ്റ്"])) {
        const maxIndex = Math.max(0, (selectedRecipe?.steps || []).length - 1);
        const nextIndex = Math.min(cookingIndex + 1, maxIndex);
        setCookingIndex(nextIndex);
        setTimerSeconds(Number(selectedRecipe?.steps?.[nextIndex]?.timerSeconds || 0));
        speakText(selectedRecipe?.steps?.[nextIndex]?.instruction || "No next step available.");
        return;
      }

      if (lower.includes("repeat") || mlIncludes(raw, ["വീണ്ടും പറയൂ", "ഒന്നുകൂടി പറയൂ", "ആവർത്തിക്കൂ"])) {
        speakText(currentStep?.instruction || "No active step to repeat.");
        return;
      }

      if (lower.includes("previous") || mlIncludes(raw, ["മുമ്പത്തെ ഘട്ടം", "പഴയ ഘട്ടം", "ബാക്ക്"])) {
        const prevIndex = Math.max(0, cookingIndex - 1);
        setCookingIndex(prevIndex);
        setTimerSeconds(Number(selectedRecipe?.steps?.[prevIndex]?.timerSeconds || 0));
        speakText(selectedRecipe?.steps?.[prevIndex]?.instruction || "No previous step available.");
        return;
      }

      if (lower.includes("grocery") || mlIncludes(raw, ["സാധനങ്ങളുടെ ലിസ്റ്റ്", "ഗ്രോസറി", "സാധനം"])) {
        generateGroceryList();
        speakText("Opening grocery list.");
        return;
      }

      if (lower.includes("tip") || mlIncludes(raw, ["ടിപ്സ്", "അടുക്കള ടിപ്സ്", "ഉപദേശം"])) {
        setTab("tips");
        speakText(todayTip?.tipText || "No kitchen tip available right now.");
        return;
      }

      if (lower.startsWith("ingredients ")) {
        const captured = raw.slice("ingredients ".length).trim();
        if (captured) {
          setGeneratorForm((current) => ({
            ...current,
            ingredients: current.ingredients ? `${current.ingredients}, ${captured}` : captured,
          }));
          speakText("Ingredients updated.");
        }
        return;
      }

      if (lower.startsWith("allergies ")) {
        const captured = raw.slice("allergies ".length).trim();
        if (captured) {
          setGeneratorForm((current) => ({
            ...current,
            allergies: current.allergies ? `${current.allergies}, ${captured}` : captured,
          }));
          speakText("Allergy notes updated.");
        }
        return;
      }

      if (lower.includes("clear ingredients")) {
        setGeneratorForm((current) => ({ ...current, ingredients: "" }));
        speakText("Ingredients cleared.");
        return;
      }

      const wantsRecipe =
        (lower.includes("recipe") &&
          (lower.includes("need") || lower.includes("want") || lower.includes("generate") || lower.includes("create") || lower.includes("show"))) ||
        mlIncludes(raw, ["റെസിപ്പി", "പാചകം", "കറി ഉണ്ടാക്കൂ", "എന്ത് ഉണ്ടാക്കാം"]);
      if (wantsRecipe) {
        let category = "Dinner";
        if (lower.includes("breakfast")) category = "Breakfast";
        else if (lower.includes("lunch")) category = "Lunch";
        else if (lower.includes("dinner")) category = "Dinner";
        else if (/(snack|snacks|tea)/.test(lower)) category = "Snacks";
        else if (lower.includes("tiffin")) category = "Breakfast";

        setGeneratorForm((current) => ({
          ...current,
          category,
        }));

        setTab("generator");
        generateRecipe({ category });
        speakText(`Generating ${category.toLowerCase()} recipe.`);
        return;
      }

      speakText(`I heard: ${raw}`);
    },
    [
      cookingIndex,
      currentStep?.instruction,
      generateGroceryList,
      generateRecipe,
      selectedRecipe?.steps,
      speakText,
      todayTip?.tipText,
    ]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!voiceEnabled) {
      pushStatus("error", "Enable voice companion first.");
      return;
    }
    if (!SpeechRecognition) {
      pushStatus("error", "Speech recognition is not supported on this browser.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getVoiceLanguageCode();
    recognition.continuous = handsFreeMode;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      processVoiceCommand(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [
    getVoiceLanguageCode,
    handsFreeMode,
    processVoiceCommand,
    pushStatus,
    voiceEnabled,
  ]);

  const captureIngredientVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      pushStatus("error", "Voice input is not supported on this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getVoiceLanguageCode();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      if (!transcript) return;
      setGeneratorForm((current) => ({
        ...current,
        ingredients: current.ingredients ? `${current.ingredients}, ${transcript}` : transcript,
      }));
      pushStatus("success", "Voice ingredients added.");
    };
    recognition.onerror = () => {
      pushStatus("error", "Could not capture voice input.");
    };

    recognition.start();
  }, [getVoiceLanguageCode, pushStatus]);

  const loadMealPlans = useCallback(async () => {
    await withBusy("meal-plan-load", async () => {
      try {
        const response = await request.get(buildApiUrl("/kitchen/meal-plans/my"));
        setMealPlans(response.data.plans || []);
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to load meal plans.");
      }
    });
  }, [pushStatus, request, withBusy]);

  const buildMealPlanGrocery = useCallback(async () => {
    await withBusy("meal-plan-grocery", async () => {
      const recipes = [
        mealPlanForm.breakfast,
        mealPlanForm.lunch,
        mealPlanForm.dinner,
        mealPlanForm.snacks,
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      if (!recipes.length) {
        setMealPlanGrocery([]);
        pushStatus("error", "Add at least one recipe name to generate grocery list.");
        return;
      }

      try {
        const response = await request.post(buildApiUrl("/kitchen/grocery-list/from-recipes"), {
          recipes,
        });
        setMealPlanGrocery(response.data.groceryList || []);
        pushStatus("success", "Meal plan grocery list generated.");
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to generate meal plan grocery list.");
      }
    });
  }, [mealPlanForm.breakfast, mealPlanForm.dinner, mealPlanForm.lunch, mealPlanForm.snacks, pushStatus, request, withBusy]);

  const saveMealPlan = useCallback(async () => {
    await withBusy("meal-plan-save", async () => {
      try {
        const payload = {
          ...mealPlanForm,
          groceryList: mealPlanGrocery,
        };
        await request.post(buildApiUrl("/kitchen/meal-plans"), payload);
        pushStatus("success", "Meal plan saved.");
        loadMealPlans();
      } catch (error) {
        pushStatus("error", error?.response?.data?.message || "Failed to save meal plan.");
      }
    });
  }, [loadMealPlans, mealPlanForm, mealPlanGrocery, pushStatus, request, withBusy]);

  useEffect(() => {
    loadMeta();
    loadRecipes();
    loadTips();
  }, [loadMeta, loadRecipes, loadTips]);

  useEffect(() => {
    if (tab === "admin" && isAdmin) {
      loadPendingCommunity();
    }
    if (tab === "admin" && !isAdmin) {
      setTab("home");
    }
  }, [isAdmin, loadPendingCommunity, tab]);

  useEffect(() => {
    if (tab === "mealplan") {
      loadMealPlans();
    }
  }, [loadMealPlans, tab]);

  useEffect(() => {
    if (!selectedRecipe?.steps?.length) return undefined;
    if (timerSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setTimerSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedRecipe?.steps, timerSeconds]);

  useEffect(() => {
    if (!handsFreeMode || !voiceEnabled) {
      stopListening();
      return;
    }

    startListening();
    return () => stopListening();
  }, [handsFreeMode, startListening, stopListening, voiceEnabled]);

  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis?.cancel?.();
    };
  }, [stopListening]);

  const trendyRecipes = recipes.slice(0, 6);
  const filteredRecipeSuggestions = useMemo(() => {
    const search = recipeFinder.search.trim().toLowerCase();
    return recipes
      .filter((recipe) =>
        recipeFinder.type === "All"
          ? true
          : recipeFinder.type === "Veg"
          ? recipe.vegType === "veg" || recipe.vegType === "vegan"
          : recipe.vegType === "non-veg" || recipe.vegType === "egg"
      )
      .filter((recipe) => {
        if (!search) return true;
        return [recipe.title, recipe.description, recipe.category, recipe.cuisine]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .slice(0, 8);
  }, [recipeFinder.search, recipeFinder.type, recipes]);

  return (
    <section className="kitchen-shell">
      <header className="kitchen-hero">
        <h1>Smart Kitchen & Recipe Hub</h1>
        <p>Food + Home Utility + AI Lifestyle module for families, students, bachelors, and homemakers.</p>
        <div className="voice-chef-card">
          <div className={`chef-avatar ${isSpeaking ? "talking" : ""} ${isListening ? "listening" : ""}`}>
            <div className="chef-face">
              <div className="chef-eyes">
                <span />
                <span />
              </div>
              <div className={`chef-mouth ${isSpeaking ? "speak" : ""}`} />
            </div>
          </div>
          <div className="voice-controls">
            <h3>{assistantName}</h3>
            <p>
              {isListening
                ? "Listening..."
                : isSpeaking
                ? "Speaking..."
                : "Ready for hands-free cooking."}
            </p>
            {lastHeardCommand ? <small>Heard: "{lastHeardCommand}"</small> : null}
            <div className="kitchen-form voice-config">
              <label>
                Companion name
                <input
                  value={assistantName}
                  onChange={(event) => setAssistantName(event.target.value)}
                />
              </label>
              <label>
                Voice language
                <select
                  value={generatorForm.language}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, language: event.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="ml">Malayalam</option>
                  <option value="hi">Hindi</option>
                </select>
              </label>
            </div>
            <div className="kitchen-inline-actions">
              <button type="button" onClick={startListening} disabled={!voiceEnabled || isListening}>
                Talk
              </button>
              <button
                type="button"
                onClick={() =>
                  speakText(
                    currentStep?.instruction ||
                      todayTip?.tipText ||
                      "Welcome to Smart Kitchen. Say start cooking to begin."
                  )
                }
              >
                Speak
              </button>
              <button type="button" onClick={stopListening} disabled={!isListening}>
                Stop Mic
              </button>
            </div>
            <div className="kitchen-inline-actions">
              <label className="kitchen-inline-check">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(event) => setVoiceEnabled(event.target.checked)}
                />
                Voice companion enabled
              </label>
              <label className="kitchen-inline-check">
                <input
                  type="checkbox"
                  checked={handsFreeMode}
                  onChange={(event) => setHandsFreeMode(event.target.checked)}
                />
                Hands-free cooking mode
              </label>
            </div>
            <div className="kitchen-chip-wall voice-command-chips">
              {VOICE_COMMAND_HINTS.map((hint) => (
                <span key={hint}>{hint}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav className="kitchen-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {status.text ? <div className={`kitchen-status ${status.type}`}>{status.text}</div> : null}

      <div className="kitchen-health-disclaimer">
        Health, allergy, diabetic, and weight-loss suggestions are general guidance only. Please consult a doctor or dietitian for medical conditions.
      </div>

      {tab === "home" ? (
        <section className="kitchen-card kitchen-quick-create">
          <div className="kitchen-grid two">
            <div className="kitchen-form kitchen-fast-form">
              <span className="kitchen-eyebrow">Start here</span>
              <h2>Cook with what you already have</h2>
              <label>
                What ingredients do you have?
                <textarea
                  rows={3}
                  placeholder="Example: rice, onion, egg, tomato"
                  value={generatorForm.ingredients}
                  onChange={(event) =>
                    setGeneratorForm((current) => ({ ...current, ingredients: event.target.value }))
                  }
                />
              </label>
              <button type="button" className="kitchen-secondary-action" onClick={captureIngredientVoice}>
                Voice Ingredient Input
              </button>
              <div className="kitchen-grid two compact">
                <label>
                  Language
                  <select
                    value={generatorForm.language}
                    onChange={(event) => setGeneratorForm((current) => ({ ...current, language: event.target.value }))}
                  >
                    <option value="en">English</option>
                    <option value="ml">Malayalam</option>
                    <option value="hi">Hindi</option>
                  </select>
                </label>
                <label>
                  Cook time
                  <select
                    value={generatorForm.maxTimeMinutes}
                    onChange={(event) =>
                      setGeneratorForm((current) => ({ ...current, maxTimeMinutes: Number(event.target.value || 20) }))
                    }
                  >
                    <option value={10}>10 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                  </select>
                </label>
              </div>
              <button type="button" className="kitchen-primary-action" onClick={generateRecipe} disabled={busyKey === "generate"}>
                {busyKey === "generate" ? "Generating recipe..." : "Generate Recipe"}
              </button>
              <button type="button" className="kitchen-secondary-action" onClick={() => setTab("generator")}>
                Advanced Settings
              </button>
            </div>
            <div>
              <p><strong>Today's tip:</strong> {todayTip?.tipText || "Loading daily tip..."}</p>
              <h3>Recipe Finder</h3>
              <div className="kitchen-grid two compact">
                <label>
                  Search
                  <input
                    placeholder="Search by name or cuisine"
                    value={recipeFinder.search}
                    onChange={(event) =>
                      setRecipeFinder((current) => ({ ...current, search: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Type
                  <select
                    value={recipeFinder.type}
                    onChange={(event) =>
                      setRecipeFinder((current) => ({ ...current, type: event.target.value }))
                    }
                  >
                    <option value="All">All</option>
                    <option value="Veg">Veg</option>
                    <option value="Non Veg">Non Veg</option>
                  </select>
                </label>
              </div>
              <h3>Quick recipe modes</h3>
              <div className="kitchen-chip-wall kitchen-action-chips">
                {["Breakfast", "Lunch", "Dinner", "Snacks", "Kids recipes", "Diabetic-friendly", "Weight-loss", "10-minute recipes"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      setGeneratorForm((current) => ({
                        ...current,
                        category: item.includes("Breakfast")
                          ? "Breakfast"
                          : item.includes("Lunch")
                          ? "Lunch"
                          : item.includes("Snacks")
                          ? "Snacks"
                          : "Dinner",
                        healthyMode: item.includes("Diabetic") || item.includes("Weight"),
                      }));
                      setTab("generator");
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <h3>Trending Recipes</h3>
              {(filteredRecipeSuggestions.length ? filteredRecipeSuggestions : trendyRecipes.slice(0, 3)).map((recipe) => (
                <article key={recipe.id || recipe._id} className="kitchen-list-item">
                  <strong>{recipe.title}</strong>
                  <p>{recipe.cuisine} | {recipe.category} | {recipe.cookingTime} min</p>
                  <button type="button" onClick={() => { loadRecipeDetail(recipe.id || recipe._id); setTab("details"); }}>
                    View
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "generator" ? (
        <section className="kitchen-card">
          <h2>AI Recipe Generator</h2>
          <div className="kitchen-grid two">
            <div className="kitchen-form">
              <label>
                Ingredients available at home
                <textarea
                  rows={4}
                  value={generatorForm.ingredients}
                  onChange={(event) =>
                    setGeneratorForm((current) => ({ ...current, ingredients: event.target.value }))
                  }
                />
              </label>
              <button type="button" onClick={captureIngredientVoice}>
                Voice Ingredient Input
              </button>
              <label>
                Cuisine
                <select
                  value={generatorForm.cuisine}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, cuisine: event.target.value }))}
                >
                  <option>Indian</option>
                  <option>Kerala</option>
                  <option>Gulf</option>
                  <option>Chinese</option>
                  <option>Continental</option>
                </select>
              </label>
              <label>
                Time limit (minutes)
                <input
                  type="number"
                  min="10"
                  value={generatorForm.maxTimeMinutes}
                  onChange={(event) =>
                    setGeneratorForm((current) => ({ ...current, maxTimeMinutes: Number(event.target.value || 20) }))
                  }
                />
              </label>
              <label>
                Veg / Non-veg
                <select
                  value={generatorForm.vegType}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, vegType: event.target.value }))}
                >
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-veg</option>
                  <option value="egg">Egg</option>
                  <option value="vegan">Vegan</option>
                </select>
              </label>
              <label>
                Language
                <select
                  value={generatorForm.language}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, language: event.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="ml">Malayalam</option>
                  <option value="hi">Hindi</option>
                </select>
              </label>
              <label className="kitchen-inline-check">
                <input
                  type="checkbox"
                  checked={generatorForm.budgetMode}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, budgetMode: event.target.checked }))}
                />
                Budget recipe option
              </label>
              <label className="kitchen-inline-check">
                <input
                  type="checkbox"
                  checked={generatorForm.healthyMode}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, healthyMode: event.target.checked }))}
                />
                Healthier cooking option
              </label>
              <label>
                Allergies (comma separated)
                <input
                  value={generatorForm.allergies}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, allergies: event.target.value }))}
                />
              </label>
              <label>
                Leftover item
                <input
                  value={generatorForm.leftoverItem}
                  onChange={(event) => setGeneratorForm((current) => ({ ...current, leftoverItem: event.target.value }))}
                />
              </label>
              <button type="button" onClick={generateRecipe} disabled={busyKey === "generate"}>
                {busyKey === "generate" ? "Generating..." : "Generate Recipe"}
              </button>
            </div>
            <div>
              <h3>AI Features Enabled</h3>
              <ul>
                <li>Generate recipes from home ingredients</li>
                <li>Budget + healthy variants</li>
                <li>Allergy warnings</li>
                <li>Leftover conversion suggestions</li>
                <li>Substitutions + grocery list output</li>
                <li>Image/video generation prompts</li>
              </ul>
              <p>Plan: {meta?.planTier || "free"}</p>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "details" ? (
        <section className="kitchen-card">
          <h2>Recipe Detail</h2>
          {!selectedRecipe ? <p>Select a recipe from Home to view details.</p> : null}
          {selectedRecipe ? (
            <div className="kitchen-grid two">
              <div>
                <h3>{selectedRecipe.title}</h3>
                <p>{selectedRecipe.description}</p>
                <p>
                  {selectedRecipe.cuisine} | {selectedRecipe.category} | {selectedRecipe.cookingTime} mins |{" "}
                  {selectedRecipe.calories || 0} kcal
                </p>
                {(selectedRecipe.allergyWarnings || selectedRecipe.warnings || []).length ? (
                  <div className="kitchen-allergy-alert">
                    <strong>Allergy warning:</strong> {(selectedRecipe.allergyWarnings || selectedRecipe.warnings || []).join(" ")}
                  </div>
                ) : null}
                <h4>Ingredients</h4>
                <ul>
                  {(selectedRecipe.ingredients || []).map((ingredient, index) => (
                    <li key={`${ingredient.name}-${index}`}>
                      {ingredient.name} {ingredient.quantity ? `(${ingredient.quantity})` : ""}
                    </li>
                  ))}
                </ul>
                <h4>Method</h4>
                <ol>
                  {(selectedRecipe.steps || []).map((step) => (
                    <li key={`step-${step.order}`}>{step.instruction}</li>
                  ))}
                </ol>
              </div>
              <div className="kitchen-actions-column">
                <button type="button" onClick={saveRecipe} disabled={busyKey === "save"}>
                  Save Recipe
                </button>
                <button type="button" onClick={() => setTab("cooking")}>
                  Start Cooking Mode
                </button>
                <button type="button" onClick={generateGroceryList} disabled={busyKey === "grocery"}>
                  Add to Grocery List
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigator.share
                      ? navigator.share({ title: selectedRecipe.title, text: selectedRecipe.description })
                      : pushStatus("success", "Share is available on supported mobile browsers.")
                  }
                >
                  Share Recipe
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "cooking" ? (
        <section className="kitchen-card">
          <h2>Step-by-Step Cooking Mode</h2>
          {!currentStep ? <p>No active recipe selected.</p> : null}
          {currentStep ? (
            <div>
              <p>Step {cookingIndex + 1} of {(selectedRecipe.steps || []).length}</p>
              <p className="kitchen-step">{currentStep.instruction}</p>
              <p>Timer: {timerSeconds}s</p>
              <div className="kitchen-inline-actions">
                <button
                  type="button"
                  onClick={() => {
                    const prevIndex = Math.max(cookingIndex - 1, 0);
                    setCookingIndex(prevIndex);
                    setTimerSeconds(Number(selectedRecipe.steps?.[prevIndex]?.timerSeconds || 0));
                    speakText(selectedRecipe.steps?.[prevIndex]?.instruction || "No previous step available.");
                  }}
                >
                  Previous Step
                </button>
                <button
                  type="button"
                  onClick={() => speakText(currentStep.instruction)}
                >
                  Voice Read
                </button>
                <button
                  type="button"
                  onClick={() => setTimerSeconds(Number(currentStep.timerSeconds || 0))}
                >
                  Reset Timer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextIndex = Math.min(cookingIndex + 1, (selectedRecipe.steps || []).length - 1);
                    setCookingIndex(nextIndex);
                    setTimerSeconds(Number(selectedRecipe.steps?.[nextIndex]?.timerSeconds || 0));
                    speakText(selectedRecipe.steps?.[nextIndex]?.instruction || "No next step available.");
                  }}
                >
                  Next Step
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "tips" ? (
        <section className="kitchen-card">
          <h2>Kitchen Tips</h2>
          <div className="kitchen-grid three">
            {tips.map((tip) => (
              <article key={tip._id}>
                <h4>{tip.title}</h4>
                <p>{tip.tipText}</p>
                <small>{tip.category}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "grocery" ? (
        <section className="kitchen-card">
          <h2>Grocery List</h2>
          {!grocery ? <p>Create a grocery list from Recipe Detail screen.</p> : null}
          {grocery ? (
            <div>
              <h4>Ingredients checklist</h4>
              <ul>
                {(grocery.items || grocery.groceryList?.items || []).map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    <input type="checkbox" checked={Boolean(item.availableAtHome)} readOnly /> {item.name}{" "}
                    {item.quantity ? `(${item.quantity})` : ""}
                  </li>
                ))}
              </ul>
              <p>
                Missing items: {(grocery.missingItems || []).map((item) => item.name).join(", ") || "None"}
              </p>
              <div className="kitchen-inline-actions">
                <button
                  type="button"
                  onClick={() => {
                    const presetText = grocery?.share?.whatsappText;
                    const link = presetText
                      ? `https://wa.me/?text=${encodeURIComponent(presetText)}`
                      : buildWhatsAppGroceryLink(grocery, selectedRecipe?.title || "Recipe");
                    window.open(link, "_blank", "noopener,noreferrer");
                  }}
                >
                  Share on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const localMarketPath = grocery?.share?.localMarketPath;
                    if (localMarketPath) {
                      window.location.href = localMarketPath;
                      return;
                    }
                    pushStatus("success", "Connect this to your Local Market module to order missing items.");
                  }}
                >
                  Order missing items
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "mealplan" ? (
        <section className="kitchen-card">
          <h2>Weekly Meal Planner</h2>
          <div className="kitchen-grid two">
            <div className="kitchen-form">
              <label>
                Date
                <input
                  type="date"
                  value={mealPlanForm.date}
                  onChange={(event) =>
                    setMealPlanForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </label>
              <label>
                Breakfast
                <input
                  placeholder="Example: Kerala Vegetable Upma"
                  value={mealPlanForm.breakfast}
                  onChange={(event) =>
                    setMealPlanForm((current) => ({ ...current, breakfast: event.target.value }))
                  }
                />
              </label>
              <label>
                Lunch
                <input
                  placeholder="Example: Sambar Rice"
                  value={mealPlanForm.lunch}
                  onChange={(event) =>
                    setMealPlanForm((current) => ({ ...current, lunch: event.target.value }))
                  }
                />
              </label>
              <label>
                Dinner
                <input
                  placeholder="Example: Egg Curry with Chapati"
                  value={mealPlanForm.dinner}
                  onChange={(event) =>
                    setMealPlanForm((current) => ({ ...current, dinner: event.target.value }))
                  }
                />
              </label>
              <label>
                Snacks
                <input
                  placeholder="Example: Banana smoothie"
                  value={mealPlanForm.snacks}
                  onChange={(event) =>
                    setMealPlanForm((current) => ({ ...current, snacks: event.target.value }))
                  }
                />
              </label>
              <label>
                Notes
                <textarea
                  rows={3}
                  placeholder="Diabetic / weight-loss notes or prep reminders"
                  value={mealPlanForm.notes}
                  onChange={(event) =>
                    setMealPlanForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </label>
              <div className="kitchen-inline-actions">
                <button type="button" onClick={buildMealPlanGrocery} disabled={busyKey === "meal-plan-grocery"}>
                  {busyKey === "meal-plan-grocery" ? "Building Grocery..." : "Generate Grocery"}
                </button>
                <button type="button" onClick={saveMealPlan} disabled={busyKey === "meal-plan-save"}>
                  {busyKey === "meal-plan-save" ? "Saving..." : "Save Meal Plan"}
                </button>
              </div>
            </div>
            <div>
              <h3>Auto Grocery List</h3>
              {!mealPlanGrocery.length ? <p>Generate from your meal plan recipes.</p> : null}
              {mealPlanGrocery.length ? (
                <ul>
                  {mealPlanGrocery.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <div className="kitchen-inline-actions">
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(mealPlanGrocery.join(", "))
                  }
                  disabled={!mealPlanGrocery.length}
                >
                  Copy Grocery List
                </button>
              </div>
              <h3>Saved Meal Plans</h3>
              {mealPlans.length === 0 ? <p>No saved meal plans yet.</p> : null}
              {mealPlans.slice(0, 8).map((plan) => (
                <article key={plan._id} className="kitchen-list-item">
                  <strong>{new Date(plan.date).toLocaleDateString()}</strong>
                  <p>
                    Breakfast: {plan.breakfast || "-"} | Lunch: {plan.lunch || "-"} | Dinner: {plan.dinner || "-"}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "community" ? (
        <section className="kitchen-card">
          <h2>Community Recipes</h2>
          <div className="kitchen-grid two">
            <div className="kitchen-form">
              <label>
                Recipe title
                <input
                  value={communityForm.title}
                  onChange={(event) => setCommunityForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                Ingredients
                <textarea
                  rows={3}
                  value={communityForm.ingredients}
                  onChange={(event) =>
                    setCommunityForm((current) => ({ ...current, ingredients: event.target.value }))
                  }
                />
              </label>
              <label>
                Steps (one per line)
                <textarea
                  rows={4}
                  value={communityForm.steps}
                  onChange={(event) => setCommunityForm((current) => ({ ...current, steps: event.target.value }))}
                />
              </label>
              <label>
                Image URL
                <input
                  value={communityForm.imageUrl}
                  onChange={(event) => setCommunityForm((current) => ({ ...current, imageUrl: event.target.value }))}
                />
              </label>
              <button type="button" onClick={submitCommunityRecipe} disabled={busyKey === "community-submit"}>
                Submit for Admin Approval
              </button>
            </div>
            <div>
              <h3>Popular Recipes</h3>
              {recipes.slice(0, 8).map((recipe) => (
                <article key={recipe.id || recipe._id} className="kitchen-list-item">
                  <strong>{recipe.title}</strong>
                  <p>{recipe.category}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {isAdmin && tab === "admin" ? (
        <section className="kitchen-card">
          <h2>Admin Panel</h2>
          <p>Approve community recipes, manage categories/tips, and feature recipes.</p>
          {pendingCommunity.length === 0 ? <p>No pending community recipes.</p> : null}
          <div className="kitchen-grid two">
            {pendingCommunity.map((item) => (
              <article key={item._id}>
                <h3>{item.title}</h3>
                <p>Ingredients: {(item.ingredients || []).join(", ")}</p>
                <p>Status: {item.status}</p>
                <div className="kitchen-inline-actions">
                  <button type="button" onClick={() => moderateCommunity(item._id, "approved")}>
                    Approve
                  </button>
                  <button type="button" onClick={() => moderateCommunity(item._id, "rejected")}>
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default SmartKitchenRecipeHub;
