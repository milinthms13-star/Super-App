import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import "./SmartKitchenRecipeHub.css";

const TABS = [
  { id: "home", label: "Kitchen Home" },
  { id: "generator", label: "AI Recipe Generator" },
  { id: "details", label: "Recipe Detail" },
  { id: "cooking", label: "Cooking Mode" },
  { id: "tips", label: "Kitchen Tips" },
  { id: "grocery", label: "Grocery List" },
  { id: "community", label: "Community Recipes" },
  { id: "admin", label: "Admin Panel" },
];

const VOICE_COMMAND_HINTS = [
  "start cooking",
  "next step",
  "repeat step",
  "grocery list",
  "tips",
  "ingredients ...",
  "allergies ...",
  "generate recipe",
];

const SmartKitchenRecipeHub = () => {
  const token = getStoredAuthToken();
  const [tab, setTab] = useState("home");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [busyKey, setBusyKey] = useState("");
  const [meta, setMeta] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [tips, setTips] = useState([]);
  const [todayTip, setTodayTip] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [grocery, setGrocery] = useState(null);
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

  const generateRecipe = useCallback(async () => {
    await withBusy("generate", async () => {
      try {
        const payload = {
          ...generatorForm,
          ingredients: generatorForm.ingredients
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean),
          allergies: generatorForm.allergies
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean),
        };

        const response = await request.post(buildApiUrl("/kitchen/recipes/generate"), payload);
        setSelectedRecipe(response.data.recipe);
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

      if (lower.includes("start cooking")) {
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

      if (lower.includes("next step") || lower === "next" || lower.includes("next")) {
        const maxIndex = Math.max(0, (selectedRecipe?.steps || []).length - 1);
        const nextIndex = Math.min(cookingIndex + 1, maxIndex);
        setCookingIndex(nextIndex);
        setTimerSeconds(Number(selectedRecipe?.steps?.[nextIndex]?.timerSeconds || 0));
        speakText(selectedRecipe?.steps?.[nextIndex]?.instruction || "No next step available.");
        return;
      }

      if (lower.includes("repeat")) {
        speakText(currentStep?.instruction || "No active step to repeat.");
        return;
      }

      if (lower.includes("previous")) {
        const prevIndex = Math.max(0, cookingIndex - 1);
        setCookingIndex(prevIndex);
        setTimerSeconds(Number(selectedRecipe?.steps?.[prevIndex]?.timerSeconds || 0));
        speakText(selectedRecipe?.steps?.[prevIndex]?.instruction || "No previous step available.");
        return;
      }

      if (lower.includes("grocery")) {
        generateGroceryList();
        speakText("Opening grocery list.");
        return;
      }

      if (lower.includes("tip")) {
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

      if (lower.includes("generate recipe")) {
        setTab("generator");
        generateRecipe();
        speakText("Generating recipe.");
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

  useEffect(() => {
    loadMeta();
    loadRecipes();
    loadTips();
  }, [loadMeta, loadRecipes, loadTips]);

  useEffect(() => {
    if (tab === "admin") {
      loadPendingCommunity();
    }
  }, [loadPendingCommunity, tab]);

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
        {TABS.map((item) => (
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

      {tab === "home" ? (
        <section className="kitchen-card">
          <div className="kitchen-grid two">
            <div>
              <label>
                What do you want to cook?
                <input
                  placeholder="Search by dish, ingredient, or category..."
                  onFocus={() => setTab("generator")}
                  readOnly
                />
              </label>
              <p><strong>Today's tip:</strong> {todayTip?.tipText || "Loading daily tip..."}</p>
              <button type="button" onClick={() => setTab("generator")}>
                Ingredient-based Recipe Generator
              </button>
              <h3>Category Cards</h3>
              <div className="kitchen-chip-wall">
                {[
                  "Breakfast",
                  "Lunch",
                  "Dinner",
                  "Snacks",
                  "Kids recipes",
                  "Diabetic-friendly",
                  "Weight-loss recipes",
                  "Festival recipes",
                  "Bachelor cooking",
                  "10-minute recipes",
                ].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <div>
              <h3>Trending Recipes</h3>
              {trendyRecipes.map((recipe) => (
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
              <button
                type="button"
                onClick={() =>
                  pushStatus(
                    "success",
                    "Share list on WhatsApp by using the generated message in the backend response."
                  )
                }
              >
                Share on WhatsApp
              </button>
            </div>
          ) : null}
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

      {tab === "admin" ? (
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
