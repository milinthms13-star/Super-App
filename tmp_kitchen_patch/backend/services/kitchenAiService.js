const normalizeList = (value = '') => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const ALLERGENS = {
  nuts: ['peanut', 'almond', 'cashew', 'pista', 'walnut'],
  dairy: ['milk', 'paneer', 'cheese', 'butter', 'ghee', 'curd', 'yogurt'],
  gluten: ['wheat', 'maida', 'atta', 'bread', 'pasta'],
  shellfish: ['prawn', 'shrimp', 'crab', 'lobster'],
  egg: ['egg'],
};

const SUBSTITUTIONS = {
  cream: 'curd or coconut milk',
  sugar: 'jaggery or dates powder',
  butter: 'olive oil or coconut oil',
  paneer: 'tofu',
  maida: 'wheat flour',
  rice: 'millets',
  potato: 'sweet potato',
};

const CUISINE_BASES = {
  Kerala: ['curry leaves', 'coconut', 'mustard seeds', 'turmeric'],
  Indian: ['onion', 'tomato', 'ginger', 'garlic'],
  Gulf: ['garam masala', 'lemon', 'mint', 'rice'],
  Chinese: ['soy sauce', 'spring onion', 'pepper', 'vinegar'],
  Continental: ['olive oil', 'herbs', 'pepper', 'garlic'],
};

const languageLabel = {
  en: 'English',
  ml: 'Malayalam',
  hi: 'Hindi',
};

const localizedText = {
  en: {
    prep: (title, cuisine) => `Prep ingredients for ${title}. Wash, chop, and keep them ready with ${cuisine} spice base.`,
    cook: 'Heat pan, add oil, saute aromatics, and add core ingredients. Stir well on medium heat.',
    finish: 'Adjust salt and seasoning, finish with garnish, and serve hot.',
    description: (cuisine, category) => `Easy ${cuisine} ${category.toLowerCase()} recipe made with home ingredients.`,
    budget: 'Budget-friendly version included.',
    healthy: 'Healthy low-oil adjustments included.',
    allergy: (allergy) => `Potential ${allergy} allergen detected.`,
  },
  ml: {
    prep: (title, cuisine) => `${title} ഉണ്ടാക്കാൻ വേണ്ട സാധനങ്ങൾ കഴുകി അരിഞ്ഞ് തയ്യാറാക്കി വയ്ക്കുക. ${cuisine} മസാല ബേസ് കൂടി റെഡി ആക്കുക.`,
    cook: 'പാൻ ചൂടാക്കി എണ്ണ ചേർക്കുക. ഉള്ളി/വെളുത്തുള്ളി പോലുള്ള അരോമാറ്റിക്സ് വഴറ്റി പ്രധാന ചേരുവകൾ ചേർത്ത് മിതമായ തീയിൽ ഇളക്കുക.',
    finish: 'ഉപ്പും മസാലയും ശരിയാക്കി ഗാർണിഷ് ചേർത്ത് ചൂടോടെ വിളമ്പുക.',
    description: (cuisine, category) => `വീട്ടിലുള്ള ചേരുവകൾ ഉപയോഗിച്ച് എളുപ്പത്തിൽ തയ്യാറാക്കാവുന്ന ${cuisine} ${category} റെസിപ്പി.`,
    budget: 'കുറഞ്ഞ ചെലവിൽ തയ്യാറാക്കാവുന്ന രീതിയും ഉൾപ്പെടുത്തിയിട്ടുണ്ട്.',
    healthy: 'കുറഞ്ഞ എണ്ണയിൽ ആരോഗ്യകരമായി തയ്യാറാക്കാനുള്ള നിർദ്ദേശവും ഉൾപ്പെടുത്തിയിട്ടുണ്ട്.',
    allergy: (allergy) => `${allergy} അലർജി സാധ്യത കണ്ടെത്തി.`,
  },
  hi: {
    prep: (title, cuisine) => `${title} के लिए सामग्री धोकर काटकर तैयार रखें और ${cuisine} मसाला बेस तैयार करें।`,
    cook: 'पैन गरम करें, तेल डालें, मसाले भूनें और मुख्य सामग्री डालकर मध्यम आंच पर पकाएं।',
    finish: 'नमक और मसाला ठीक करें, गार्निश करें और गरम परोसें।',
    description: (cuisine, category) => `घर की सामग्री से बनने वाली आसान ${cuisine} ${category} रेसिपी।`,
    budget: 'बजट-फ्रेंडली तरीका शामिल है।',
    healthy: 'कम तेल वाला हेल्दी विकल्प शामिल है।',
    allergy: (allergy) => `${allergy} एलर्जी की संभावना मिली।`,
  },
};

const getCopy = (language = 'en') => localizedText[language] || localizedText.en;

const mapIngredientObjects = (ingredients = []) =>
  ingredients.map((ingredient) => ({ name: ingredient, quantity: 'as needed', optional: false }));

const generateSteps = ({ title, cuisine, maxTimeMinutes, language }) => {
  const copy = getCopy(language);
  const prepMinutes = Math.max(3, Math.round(maxTimeMinutes * 0.25));
  const cookMinutes = Math.max(6, Math.round(maxTimeMinutes * 0.55));
  const finishMinutes = Math.max(2, maxTimeMinutes - prepMinutes - cookMinutes);

  return [
    {
      order: 1,
      instruction: copy.prep(title, cuisine),
      timerSeconds: prepMinutes * 60,
    },
    {
      order: 2,
      instruction: copy.cook,
      timerSeconds: cookMinutes * 60,
    },
    {
      order: 3,
      instruction: copy.finish,
      timerSeconds: finishMinutes * 60,
    },
  ];
};

const detectAllergyRisk = (ingredients = [], allergies = []) => {
  const normalizedIngredients = ingredients.map((item) => item.toLowerCase());
  const normalizedAllergies = normalizeList(allergies).map((item) => item.toLowerCase());
  const risks = [];

  normalizedAllergies.forEach((allergy) => {
    const variants = ALLERGENS[allergy] || [allergy];
    const matched = variants.some((variant) => normalizedIngredients.some((item) => item.includes(variant)));
    if (matched) {
      risks.push(getCopy('en').allergy(allergy));
    }
  });

  return risks;
};

const buildSubstitutions = (ingredients = []) => {
  const suggestions = [];
  ingredients.forEach((ingredient) => {
    const key = ingredient.toLowerCase();
    if (SUBSTITUTIONS[key]) {
      suggestions.push(`${ingredient} -> ${SUBSTITUTIONS[key]}`);
    }
  });
  return suggestions;
};

const buildRecipeImagePrompt = (recipe = {}) =>
  `Premium food photography of ${recipe.title}, ${recipe.cuisine} style plating, clean Indian home kitchen, natural light, appetizing, high detail`;

const buildRecipeVideoPrompt = (recipe = {}) =>
  `Vertical short cooking video for ${recipe.title}, step-by-step close-up shots, clean kitchen counter, ingredients, pan action, garnish and final plating`;

const buildAiRecipePrompt = (payload = {}) => {
  const language = languageLabel[payload.language] || 'English';
  const ingredients = normalizeList(payload.ingredients).join(', ');
  const allergies = normalizeList(payload.allergies).join(', ') || 'none';
  return `Create a practical home cooking recipe in ${language}. Ingredients available: ${ingredients}. Cuisine: ${payload.cuisine || 'Indian'}. Category: ${payload.category || 'Dinner'}. Max time: ${payload.maxTimeMinutes || 25} minutes. Allergies to avoid: ${allergies}. Return title, description, ingredients with quantity, 3-6 steps, calories estimate, grocery missing items, substitutions, and allergy warnings. Keep the language natural and friendly.`;
};

const createRecipeFromIngredients = (payload = {}) => {
  const ingredients = normalizeList(payload.ingredients);
  const cuisine = String(payload.cuisine || 'Indian').trim();
  const category = String(payload.category || 'Dinner').trim();
  const vegType = String(payload.vegType || 'veg').trim().toLowerCase();
  const language = String(payload.language || 'en').trim().toLowerCase();
  const maxTimeMinutes = Math.max(10, Number(payload.maxTimeMinutes || 25));
  const copy = getCopy(language);
  const budgetMode = Boolean(payload.budgetMode);
  const healthyMode = Boolean(payload.healthyMode);

  const primaryIngredient = ingredients[0] || 'Mixed Veg';
  const title = `${cuisine} ${primaryIngredient} Quick ${category}`;
  const cuisineBase = CUISINE_BASES[cuisine] || CUISINE_BASES.Indian;
  const allIngredients = Array.from(new Set([...ingredients, ...cuisineBase]));
  const calories = Math.max(150, 220 + allIngredients.length * 28 + (vegType === 'non-veg' ? 90 : 0));

  const descriptionParts = [
    copy.description(cuisine, category),
    budgetMode ? copy.budget : '',
    healthyMode ? copy.healthy : '',
    `Language support: ${languageLabel[language] || 'English'}.`,
  ].filter(Boolean);

  return {
    recipe: {
      title,
      description: descriptionParts.join(' '),
      cuisine,
      category,
      vegType,
      cookingTime: maxTimeMinutes,
      difficulty: 'easy',
      ingredients: mapIngredientObjects(allIngredients),
      steps: generateSteps({ title, cuisine, maxTimeMinutes, language }),
      calories,
      language,
      tags: [category.toLowerCase(), cuisine.toLowerCase(), budgetMode ? 'budget' : '', healthyMode ? 'healthy' : ''].filter(Boolean),
      nutritionGoals: healthyMode ? ['balanced', 'low-oil'] : [],
      allergyWarnings: detectAllergyRisk(allIngredients, payload.allergies),
    },
    groceryList: allIngredients.map((name) => ({ name, quantity: '1 unit', availableAtHome: ingredients.includes(name) })),
    substitutions: buildSubstitutions(allIngredients),
    allergyWarnings: detectAllergyRisk(allIngredients, payload.allergies),
  };
};

const createLeftoverRecipes = (leftoverItem = '') => {
  const item = String(leftoverItem || '').trim().toLowerCase();
  if (!item) return [];

  const map = {
    rice: ['Lemon fried rice', 'Rice cutlet', 'Kerala style kanji remix'],
    chapati: ['Chapati noodles', 'Kothu chapati', 'Chapati rolls'],
    chicken: ['Chicken sandwich filling', 'Chicken fried rice', 'Chicken cutlet'],
    idli: ['Idli upma', 'Masala idli roast', 'Idli chili'],
    dosa: ['Dosa roll-up', 'Dosa chips', 'Stuffed dosa bites'],
  };

  const matched = map[item] || [`${item} stir fry bowl`, `${item} masala wraps`, `${item} quick snack patties`];
  return matched.map((title, index) => ({
    title,
    shortIdea: `Use leftover ${item} with spice base and fresh garnish.`,
    estimatedTime: 10 + index * 5,
  }));
};

module.exports = {
  normalizeList,
  createRecipeFromIngredients,
  createLeftoverRecipes,
  buildRecipeImagePrompt,
  buildRecipeVideoPrompt,
  buildAiRecipePrompt,
};

