const express = require('express');

const auth = require('../middleware/auth');
const KitchenRecipe = require('../models/KitchenRecipe');
const KitchenTip = require('../models/KitchenTip');
const SavedRecipe = require('../models/SavedRecipe');
const GroceryList = require('../models/GroceryList');
const CommunityRecipe = require('../models/CommunityRecipe');
const RecipeReview = require('../models/RecipeReview');
const {
  normalizeList,
  createRecipeFromIngredients,
  createLeftoverRecipes,
  buildRecipeImagePrompt,
  buildRecipeVideoPrompt,
} = require('../services/kitchenAiService');

const router = express.Router();
const authenticate = auth.authenticate || auth;
const verifyAdmin = auth.verifyAdmin || ((req, res, next) => next());

const DEFAULT_TIPS = [
  {
    title: 'Store Curry Leaves Fresh',
    tipText: 'Wrap curry leaves in a dry tissue and keep in an airtight box.',
    category: 'food-storage',
    language: 'en',
  },
  {
    title: 'Knife Safety First',
    tipText: 'Use a stable chopping board and keep fingers curled while cutting.',
    category: 'kitchen-safety',
    language: 'en',
  },
  {
    title: 'Healthy Kerala Tempering',
    tipText: 'Use less oil and roast mustard seeds briefly for flavor without extra fat.',
    category: 'healthy-cooking',
    language: 'en',
  },
];

const DEFAULT_RECIPES = [
  {
    title: 'Kerala Vegetable Upma',
    description: 'Quick breakfast with roasted rava and vegetables.',
    cuisine: 'Kerala',
    category: 'Breakfast',
    vegType: 'veg',
    cookingTime: 20,
    difficulty: 'easy',
    calories: 320,
    ingredients: [
      { name: 'rava', quantity: '1 cup' },
      { name: 'onion', quantity: '1 small' },
      { name: 'carrot', quantity: '1/2 cup' },
      { name: 'curry leaves', quantity: 'few' },
    ],
    steps: [
      { order: 1, instruction: 'Dry roast rava for 4-5 minutes.', timerSeconds: 300 },
      { order: 2, instruction: 'Saute onion, carrot, curry leaves and add water.', timerSeconds: 480 },
      { order: 3, instruction: 'Add rava slowly and cook until fluffy.', timerSeconds: 420 },
    ],
    status: 'approved',
    sourceType: 'seed',
    tags: ['breakfast', 'quick', 'kerala'],
  },
  {
    title: '10-Minute Egg Fried Rice',
    description: 'Leftover rice based quick dinner for bachelors.',
    cuisine: 'Indian',
    category: '10-minute recipes',
    vegType: 'egg',
    cookingTime: 10,
    difficulty: 'easy',
    calories: 410,
    ingredients: [
      { name: 'cooked rice', quantity: '2 cups' },
      { name: 'egg', quantity: '2' },
      { name: 'onion', quantity: '1 small' },
      { name: 'soy sauce', quantity: '1 tsp' },
    ],
    steps: [
      { order: 1, instruction: 'Scramble eggs and keep aside.', timerSeconds: 180 },
      { order: 2, instruction: 'Saute onion, add rice and soy sauce.', timerSeconds: 240 },
      { order: 3, instruction: 'Mix egg, garnish and serve hot.', timerSeconds: 120 },
    ],
    status: 'approved',
    sourceType: 'seed',
    tags: ['leftover', 'bachelor', 'quick'],
  },
];

const safeObjectId = (value = '') => {
  try {
    return String(value || '').trim();
  } catch (_error) {
    return '';
  }
};

const getUserId = (req) =>
  safeObjectId(req?.user?._id || req?.user?.id || req?.userId || req?.auth?.sub);

const getPlanTier = (user = {}) => {
  const normalized = String(
    user?.subscriptionPlan || user?.planName || user?.subscriptionStatus || ''
  ).toLowerCase();

  if (user?.isAdmin || normalized.includes('business')) return 'business';
  if (user?.isPremium || normalized.includes('premium') || normalized.includes('pro')) return 'premium';
  return 'free';
};

const ensureSeedData = async () => {
  const tipCount = await KitchenTip.countDocuments({});
  if (tipCount === 0) {
    await KitchenTip.insertMany(DEFAULT_TIPS);
  }

  const recipeCount = await KitchenRecipe.countDocuments({});
  if (recipeCount === 0) {
    await KitchenRecipe.insertMany(DEFAULT_RECIPES);
  }
};

const mapRecipeSummary = (recipeDoc = {}) => ({
  id: recipeDoc._id,
  title: recipeDoc.title,
  description: recipeDoc.description,
  cuisine: recipeDoc.cuisine,
  category: recipeDoc.category,
  vegType: recipeDoc.vegType,
  cookingTime: recipeDoc.cookingTime,
  difficulty: recipeDoc.difficulty,
  calories: recipeDoc.calories,
  imageUrl: recipeDoc.imageUrl || '',
  videoUrl: recipeDoc.videoUrl || '',
  status: recipeDoc.status,
  tags: recipeDoc.tags || [],
});

router.get('/meta', authenticate, (_req, res) => {
  res.json({
    success: true,
    module: 'Smart Kitchen & Recipe Hub',
    capabilities: [
      'Daily kitchen tips',
      'AI recipe generator from ingredients',
      'Leftover food recipe ideas',
      'Step-by-step cooking mode',
      'Grocery list generator',
      'Community recipe upload + admin approval',
      'Multi-language output support (EN, ML, HI)',
      'Voice cooking assistant contract',
    ],
    monetization: {
      free: ['Basic tips', 'Limited recipe search', 'Save up to 10 recipes'],
      premium: [
        'Unlimited AI recipe generation',
        'Personalized diet recipes',
        'Voice cooking assistant',
        'Weekly meal plan',
        'Ad-free experience',
      ],
      business: [
        'Restaurant recipe uploads',
        'Cloud kitchen promotion',
        'Grocery integration slots',
        'Sponsored recipe listings',
      ],
    },
  });
});

router.get('/recipes', authenticate, async (req, res) => {
  try {
    await ensureSeedData();

    const userId = getUserId(req);
    const planTier = getPlanTier(req.user);
    const isAdminUser = planTier === 'business' && req.user?.isAdmin;

    const query = {};
    if (!isAdminUser) query.status = 'approved';
    if (req.query.category) query.category = String(req.query.category).trim();
    if (req.query.cuisine) query.cuisine = String(req.query.cuisine).trim();
    if (req.query.vegType) query.vegType = String(req.query.vegType).trim();

    const limit = Math.min(
      Number(req.query.limit || (planTier === 'free' ? 20 : 80)),
      planTier === 'free' ? 20 : 120
    );

    const recipes = await KitchenRecipe.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    const savedIds = userId
      ? await SavedRecipe.find({ userId }).distinct('recipeId')
      : [];
    const savedLookup = new Set((savedIds || []).map((id) => String(id)));

    res.json({
      success: true,
      planTier,
      count: recipes.length,
      recipes: recipes.map((recipe) => ({
        ...mapRecipeSummary(recipe),
        isSaved: savedLookup.has(String(recipe._id)),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load recipes.', error: error.message });
  }
});

router.get('/recipes/:id', authenticate, async (req, res) => {
  try {
    const recipe = await KitchenRecipe.findById(req.params.id).lean();
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found.' });
    }

    const reviews = await RecipeReview.find({ recipeId: recipe._id }).sort({ createdAt: -1 }).limit(10).lean();
    return res.json({
      success: true,
      recipe: {
        ...recipe,
        id: recipe._id,
      },
      reviews,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load recipe.', error: error.message });
  }
});

router.post('/recipes/generate', authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    const planTier = getPlanTier(req.user);
    const ingredients = normalizeList(req.body.ingredients);

    if (ingredients.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one ingredient.' });
    }

    if (planTier === 'free') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const usageCount = await KitchenRecipe.countDocuments({
        createdBy: userId,
        sourceType: 'ai-generated',
        createdAt: { $gte: since },
      });
      if (usageCount >= 3) {
        return res.status(402).json({
          success: false,
          message: 'Free plan limit reached for AI generation. Upgrade to premium for unlimited generation.',
        });
      }
    }

    const generated = createRecipeFromIngredients(req.body);
    const doc = await KitchenRecipe.create({
      ...generated.recipe,
      sourceType: 'ai-generated',
      createdBy: userId || undefined,
      status: 'approved',
    });

    return res.status(201).json({
      success: true,
      planTier,
      recipe: { ...doc.toObject(), id: doc._id },
      groceryList: generated.groceryList,
      substitutions: generated.substitutions,
      allergyWarnings: generated.allergyWarnings,
      leftoverIdeas: createLeftoverRecipes(req.body.leftoverItem),
      prompts: {
        imagePrompt: buildRecipeImagePrompt(doc),
        videoPrompt: buildRecipeVideoPrompt(doc),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate recipe.', error: error.message });
  }
});

router.get('/tips', authenticate, async (req, res) => {
  try {
    await ensureSeedData();
    const language = String(req.query.language || 'en').trim();
    const category = String(req.query.category || '').trim();
    const query = { status: 'published', ...(category ? { category } : {}) };
    const tips = await KitchenTip.find(query).sort({ createdAt: -1 }).limit(40).lean();

    const filtered = tips.filter((tip) => tip.language === language || tip.language === 'en');
    return res.json({
      success: true,
      language,
      todayTip: filtered[0] || tips[0] || null,
      tips: filtered,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load kitchen tips.', error: error.message });
  }
});

router.post('/save-recipe', authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    const recipeId = safeObjectId(req.body.recipeId);
    const planTier = getPlanTier(req.user);

    if (!recipeId) {
      return res.status(400).json({ success: false, message: 'recipeId is required.' });
    }

    if (planTier === 'free') {
      const currentSavedCount = await SavedRecipe.countDocuments({ userId });
      if (currentSavedCount >= 10) {
        return res.status(402).json({
          success: false,
          message: 'Free plan can save up to 10 recipes. Upgrade to premium for unlimited saved recipes.',
        });
      }
    }

    await SavedRecipe.updateOne(
      { userId, recipeId },
      { $setOnInsert: { userId, recipeId } },
      { upsert: true }
    );

    return res.status(201).json({ success: true, message: 'Recipe saved successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to save recipe.', error: error.message });
  }
});

router.post('/grocery-list', authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    const recipeId = safeObjectId(req.body.recipeId);
    const availableAtHome = new Set(normalizeList(req.body.availableAtHome).map((item) => item.toLowerCase()));

    const recipe = recipeId ? await KitchenRecipe.findById(recipeId).lean() : null;
    const inputItems = normalizeList(req.body.items);

    const sourceItems = recipe
      ? (recipe.ingredients || []).map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity || '',
          availableAtHome: availableAtHome.has(String(ingredient.name || '').toLowerCase()),
        }))
      : inputItems.map((item) => ({ name: item, quantity: '', availableAtHome: false }));

    const grocery = await GroceryList.create({
      userId,
      recipeId: recipeId || undefined,
      items: sourceItems,
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      groceryList: grocery,
      missingItems: sourceItems.filter((item) => !item.availableAtHome),
      share: {
        whatsappText: `Grocery list from Smart Kitchen: ${sourceItems
          .filter((item) => !item.availableAtHome)
          .map((item) => item.name)
          .join(', ')}`,
        localMarketPath: '/localmarket',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create grocery list.', error: error.message });
  }
});

router.post('/community-recipe', authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    const title = String(req.body.title || '').trim();
    const ingredients = normalizeList(req.body.ingredients);
    const steps = normalizeList(req.body.steps);

    if (!title || ingredients.length === 0 || steps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'title, ingredients, and steps are required.',
      });
    }

    const recipe = await CommunityRecipe.create({
      userId,
      title,
      ingredients,
      steps,
      imageUrl: String(req.body.imageUrl || '').trim(),
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Community recipe submitted for admin approval.',
      recipe,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit community recipe.', error: error.message });
  }
});

router.get('/admin/pending-recipes', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const pending = await CommunityRecipe.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: pending.length, pending });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load pending recipes.', error: error.message });
  }
});

router.put('/admin/approve-recipe/:id', authenticate, verifyAdmin, async (req, res) => {
  try {
    const id = safeObjectId(req.params.id);
    const status = String(req.body.status || 'approved').trim().toLowerCase();
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected.' });
    }

    const community = await CommunityRecipe.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community recipe not found.' });
    }

    community.status = status;
    await community.save();

    if (status === 'approved') {
      await KitchenRecipe.create({
        title: community.title,
        description: 'Community submitted recipe',
        cuisine: 'Indian',
        category: 'Community',
        vegType: 'veg',
        cookingTime: 25,
        difficulty: 'easy',
        ingredients: (community.ingredients || []).map((name) => ({ name, quantity: '' })),
        steps: (community.steps || []).map((instruction, index) => ({
          order: index + 1,
          instruction,
          timerSeconds: 0,
        })),
        imageUrl: community.imageUrl || '',
        calories: 0,
        sourceType: 'community',
        status: 'approved',
        createdBy: community.userId,
      });
    }

    res.json({
      success: true,
      message: `Community recipe ${status}.`,
      recipe: community,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update community recipe.', error: error.message });
  }
});

module.exports = router;

