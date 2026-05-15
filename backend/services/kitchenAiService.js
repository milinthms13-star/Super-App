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

const mapIngredientObjects = (ingredients = []) =>
  ingredients.map((ingredient) => ({ name: ingredient, quantity: 'as needed', optional: false }));

const generateSteps = ({ title, cuisine, maxTimeMinutes }) => {
  const prepMinutes = Math.max(3, Math.round(maxTimeMinutes * 0.25));
  const cookMinutes = Math.max(6, Math.round(maxTimeMinutes * 0.55));
  const finishMinutes = Math.max(2, maxTimeMinutes - prepMinutes - cookMinutes);

  return [
    {
      order: 1,
      instruction: `Prep ingredients for ${title}. Wash, chop, and keep them ready with ${cuisine} spice base.`,
      timerSeconds: prepMinutes * 60,
    },
    {
      order: 2,
      instruction: 'Heat pan, add oil, saute aromatics, and add core ingredients. Stir well on medium heat.',
      timerSeconds: cookMinutes * 60,
    },
    {
      order: 3,
      instruction: 'Adjust salt and seasoning, finish with garnish, and serve hot.',
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
      risks.push(`Potential ${allergy} allergen detected.`);
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
  `Food photography, ${recipe.title}, ${recipe.cuisine} style plating, natural kitchen lighting, high detail`;

const buildRecipeVideoPrompt = (recipe = {}) =>
  `Vertical short cooking video for ${recipe.title}, step-by-step close-up shots, clean kitchen counter, social media style`;

const createRecipeFromIngredients = (payload = {}) => {
  const ingredients = normalizeList(payload.ingredients);
  const cuisine = String(payload.cuisine || 'Indian').trim();
  const category = String(payload.category || 'Dinner').trim();
  const vegType = String(payload.vegType || 'veg').trim().toLowerCase();
  const language = String(payload.language || 'en').trim().toLowerCase();
  const maxTimeMinutes = Math.max(10, Number(payload.maxTimeMinutes || 25));
  const budgetMode = Boolean(payload.budgetMode);
  const healthyMode = Boolean(payload.healthyMode);

  const primaryIngredient = ingredients[0] || 'Mixed Veg';
  const title = `${cuisine} ${primaryIngredient} Quick ${category}`;
  const cuisineBase = CUISINE_BASES[cuisine] || CUISINE_BASES.Indian;
  const allIngredients = Array.from(new Set([...ingredients, ...cuisineBase]));
  const calories = Math.max(150, 220 + allIngredients.length * 28 + (vegType === 'non-veg' ? 90 : 0));

  const descriptionParts = [
    `Easy ${cuisine} ${category.toLowerCase()} recipe made with home ingredients.`,
    budgetMode ? 'Budget-friendly version included.' : '',
    healthyMode ? 'Healthy low-oil adjustments included.' : '',
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
      steps: generateSteps({ title, cuisine, maxTimeMinutes }),
      calories,
      language,
      tags: [category.toLowerCase(), cuisine.toLowerCase(), budgetMode ? 'budget' : '', healthyMode ? 'healthy' : ''].filter(Boolean),
      nutritionGoals: healthyMode ? ['balanced', 'low-oil'] : [],
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
};

