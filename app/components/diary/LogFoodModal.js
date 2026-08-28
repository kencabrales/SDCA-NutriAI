// LogFoodModal.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, Search, Loader2, Plus, ArrowUpDown, Utensils, Edit3, ChefHat,
  ChevronDown, SlidersHorizontal, Zap, Trash2 
} from 'lucide-react';
import CreateMealModal from './CreateMealModal';
import CreateRecipeModal from './CreateRecipeModal';
import FoodDetailModal from './FoodDetailModal';
import { useConfirm } from '../ConfirmContext';

export default function LogFoodModal({ 
  isOpen, 
  mealType, 
  userId,
  onClose, 
  onSelectFood, 
  onCreateCustomFood, 
  onDeleteCustomFood,
  onCreateRecipe,
  showToastNotification
}) {
  const confirm = useConfirm();

  const [currentMealType, setCurrentMealType] = useState(mealType);
  const [isMealDropdownOpen, setIsMealDropdownOpen] = useState(false);

 const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [isSearching, setIsSearching] = useState(false);
const [isLoadingTab, setIsLoadingTab] = useState(false);

const [activeCategoryTab, setActiveCategoryTab] = useState('all');
const [sortOrder, setSortOrder] = useState('newest');
const [clearedIds, setClearedIds] = useState([]);

  const [recentFoods, setRecentFoods] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [customRecipes, setCustomRecipes] = useState([]);
  const [userMeals, setUserMeals] = useState([]);

  const [isCreateMealOpen, setIsCreateMealOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [mealItems, setMealItems] = useState([]);
  const [isSelectingForMeal, setIsSelectingForMeal] = useState(false);
  const [mealDraftTarget, setMealDraftTarget] = useState(null);
  const [isMealAddDetailOpen, setIsMealAddDetailOpen] = useState(false);

  const [isCreateRecipeOpen, setIsCreateRecipeOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [isSelectingForRecipe, setIsSelectingForRecipe] = useState(false);
  const [recipeDraftTarget, setRecipeDraftTarget] = useState(null);
  const [isRecipeAddDetailOpen, setIsRecipeAddDetailOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentMealType(mealType || 'Breakfast');
      setIsMealDropdownOpen(false);
      fetchAllInitialData();

      if (userId) {
  const saved = localStorage.getItem(`recentClearedIds_${userId}`);
  setClearedIds(saved ? JSON.parse(saved) : []);
}
      setIsSelectingForMeal(false);
      setIsCreateMealOpen(false);
      setIsMealAddDetailOpen(false);
      setMealDraftTarget(null);
      setMealItems([]);
      setEditingMeal(null);

      setIsSelectingForRecipe(false);
      setIsCreateRecipeOpen(false);
      setIsRecipeAddDetailOpen(false);
      setRecipeDraftTarget(null);
      setRecipeIngredients([]);
      setEditingRecipe(null);
    }
  }, [isOpen, mealType]);

  const fetchAllInitialData = useCallback(async () => {
    if (!userId) return;
    setIsLoadingTab(true);

    try {
      const [logsRes, foodsRes, recipesRes, mealsRes] = await Promise.all([
        fetch(`/api/food-log?userId=${userId}&limit=50`),
        fetch(`/api/custom-food?userId=${userId}`),
        fetch(`/api/recipes?userId=${userId}`),
        fetch(`/api/meals?userId=${userId}`)
      ]);

      if (logsRes.ok) {
  const logsData = await logsRes.json();
  const rawLogs = logsData.logs || [];
  const uniqueRecentMap = new Map();
  rawLogs.forEach((log) => {
    const key = log.foodName?.trim().toLowerCase();
    if (key && !uniqueRecentMap.has(key)) {
      uniqueRecentMap.set(key, log);
    }
  });
  setRecentFoods(Array.from(uniqueRecentMap.values()));
}
      
      if (foodsRes.ok) {
        const foodsData = await foodsRes.json();
        setCustomFoods(foodsData.foods || []);
      }
      
      if (recipesRes.ok) {
        const recipesData = await recipesRes.json();
        setCustomRecipes(recipesData.recipes || recipesData.data || []);
      }

      if (mealsRes.ok) {
        const mealsData = await mealsRes.json();
        setUserMeals(mealsData.meals || []);
      }
    } catch (err) {
      console.error('Error fetching modal data:', err);
    } finally {
      setIsLoadingTab(false);
    }
  }, [userId]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-food?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.products || data.foods || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const normalizeItem = (item) => {
    if (!item) return null;
    console.log('normalizeItem received:', item.foodName, 'amount:', item.amount, 'defaultServingAmount:', item.defaultServingAmount);


    const getVal = (...keys) => {
      for (const k of keys) {
        if (item[k] !== undefined && item[k] !== null && !isNaN(item[k])) {
          return Number(item[k]);
        }
        if (item.nutrients && item.nutrients[k] !== undefined) {
          return Number(item.nutrients[k]);
        }
        if (item.totalNutrients && item.totalNutrients[k] !== undefined) {
          return Number(item.totalNutrients[k]?.quantity ?? item.totalNutrients[k]);
        }
        if (item.nutrition && item.nutrition[k] !== undefined) {
          return Number(item.nutrition[k]);
        }
      }
      return 0;
    };

    const detectedUnit = item.unit || item.servingUnit || item.metricUnit || 'g';
const parseNumeric = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const match = String(val).match(/([\d.]+)/);
  if (!match) return null;
  const num = Number(match[1]);
  return isNaN(num) ? null : num;
};

const detectedAmount =
  parseNumeric(item.amount) ||
  parseNumeric(item.servingAmount) ||
  parseNumeric(item.servingQty) ||
  parseNumeric(item.servingSizeQty) ||
  parseNumeric(item.servingSize) ||
  100;
    const detectedDefaultServing = parseNumeric(item.defaultServingAmount) || detectedAmount;
    const resolvedName = item.foodName || item.recipeName || item.title || item.name || 'Food Item';

    return {
      ...item,
      id: item._id || item.id || Math.random().toString(36).substr(2, 9),
      foodName: resolvedName,
      name: resolvedName,
      calories: getVal('calories', 'energy', 'totalCalories', 'nf_calories', 'ENERC_KCAL'),
      carbs: getVal('carbs', 'carbsGrams', 'carbohydrates', 'carbs_g', 'nf_total_carbohydrate', 'CHOCDF'),
      fat: getVal('fat', 'fatGrams', 'totalFat', 'fat_g', 'nf_total_fat', 'FAT'),
      protein: getVal('protein', 'proteinGrams', 'totalProtein', 'protein_g', 'nf_protein', 'PROCNT'),
      
      satFat: getVal('satFat', 'satFatGoal', 'saturatedFat', 'nf_saturated_fat', 'FASAT'),
      polyFat: getVal('polyFat', 'polyFatGoal', 'polyunsaturatedFat', 'FAPPU'),
      monoFat: getVal('monoFat', 'monoFatGoal', 'monounsaturatedFat', 'FAMS'),
      transFat: getVal('transFat', 'transFatGoal', 'transFat', 'FATRN'),
      cholesterol: getVal('cholesterol', 'cholesterolGoal', 'nf_cholesterol', 'CHOLE'),
      sodium: getVal('sodium', 'sodiumGoal', 'nf_sodium', 'NA'),
      potassium: getVal('potassium', 'potassiumGoal', 'K'),
      fiber: getVal('fiber', 'fiberGoal', 'dietaryFiber', 'nf_dietary_fiber', 'FIBTG'),
      sugar: getVal('sugar', 'sugarGoal', 'sugars', 'nf_sugars', 'SUGAR'),

      amount: detectedAmount,
      servingAmount: detectedAmount,
      defaultServingAmount: detectedDefaultServing,
      servingSize: item.servingSize || `${detectedAmount} ${detectedUnit}`,
      unit: detectedUnit,
      numberOfServings: Number(item.numberOfServings || item.servings || 1),
      mealType: currentMealType 
    };
  };

const handleQuickLogMeal = (meal, e) => {
  e.stopPropagation();
  const payload = {
    foodName: meal.name,
    name: meal.name,
    calories: Number(meal.totalCalories || 0),
    carbs: Number(meal.totalCarbs || 0),
    fat: Number(meal.totalFat || 0),
    protein: Number(meal.totalProtein || 0),
    sodium: Number(meal.totalSodium || 0),
    sugar: Number(meal.totalSugar || 0),
    fiber: Number(meal.totalFiber || 0),
    cholesterol: Number(meal.totalCholesterol || 0),
    potassium: Number(meal.totalPotassium || 0),
    satFat: Number(meal.totalSatFat || 0),
    polyFat: Number(meal.totalPolyFat || 0),
    monoFat: Number(meal.totalMonoFat || 0),
    transFat: Number(meal.totalTransFat || 0),
    vitaminA: Number(meal.totalVitaminA || 0),
    vitaminC: Number(meal.totalVitaminC || 0),
    calcium: Number(meal.totalCalcium || 0),
    iron: Number(meal.totalIron || 0),
    vitaminB12: Number(meal.totalVitaminB12 || 0),
    vitaminD: Number(meal.totalVitaminD || 0),
    servingSize: '1 meal',
    unit: 'meal',
    amount: 1,
    numberOfServings: 1,
    isMealAggregate: true,
    mealType: currentMealType
  };

  onSelectFood?.(payload, currentMealType);
  showToastNotification?.('Meal Logged!', `Successfully logged "${meal.name}" for ${currentMealType}.`, 'success');
};

  const handleEditMeal = (meal) => {
    setEditingMeal(meal);
    setIsCreateMealOpen(true);
  };

  const handleDeleteMeal = async (meal) => {
    const isConfirmed = await confirm({
      title: 'Delete Meal?',
      message: `Are you sure you want to delete "${meal.name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return false;

    try {
      const res = await fetch(`/api/meals?id=${meal._id}&userId=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUserMeals((prev) => prev.filter((m) => m._id !== meal._id));
        showToastNotification?.('Meal Deleted', `Removed "${meal.name}".`, 'success');
        return true;
      } else {
        showToastNotification?.('Error', 'Failed to delete meal.', 'error');
        return false;
      }
    } catch (err) {
      console.error(err);
      showToastNotification?.('Error', 'Network error while deleting meal.', 'error');
      return false;
    }
  };

  const handleConfirmMealDraftItem = (payload) => {
    const draftItem = {
      ...payload,
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    };
    setMealItems((prev) => [...prev, draftItem]);
    setIsMealAddDetailOpen(false);
    setMealDraftTarget(null);
    setIsCreateMealOpen(true);
    showToastNotification?.('Item Added!', `Added ${draftItem.foodName} to meal draft.`, 'success');
  };

  const handleConfirmRecipeDraftIngredient = (payload) => {
    const draftIngredient = {
      ...payload,
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    };
    setRecipeIngredients((prev) => [...prev, draftIngredient]);
    setIsRecipeAddDetailOpen(false);
    setRecipeDraftTarget(null);
    setIsCreateRecipeOpen(true);
    showToastNotification?.('Ingredient Added!', `Added ${draftIngredient.foodName} to recipe.`, 'success');
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setIsCreateRecipeOpen(true);
  };

  const handleDeleteRecipe = async (recipe) => {
    const isConfirmed = await confirm({
      title: 'Delete Recipe?',
      message: `Are you sure you want to delete "${recipe.name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return false;

    try {
      const res = await fetch(`/api/recipes?id=${recipe._id}&userId=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomRecipes((prev) => prev.filter((r) => r._id !== recipe._id));
        showToastNotification?.('Recipe Deleted', `Removed "${recipe.name}".`, 'success');
        return true;
      } else {
        showToastNotification?.('Error', 'Failed to delete recipe.', 'error');
        return false;
      }
    } catch (err) {
      console.error(err);
      showToastNotification?.('Error', 'Network error while deleting recipe.', 'error');
      return false;
    }
  };

const handleQuickLogRecipe = (recipe, e) => {
  e.stopPropagation();
  const payload = {
    foodName: recipe.name,
    name: recipe.name,
    calories: Number(recipe.perServingCalories || 0),
    carbs: Number(recipe.perServingCarbs || 0),
    fat: Number(recipe.perServingFat || 0),
    protein: Number(recipe.perServingProtein || 0),
    // Recipe documents (lib/Recipe.js) store these 15 pre-computed
    // per-serving micronutrient fields — previously dropped here.
    sodium: Number(recipe.perServingSodium || 0),
    sugar: Number(recipe.perServingSugar || 0),
    fiber: Number(recipe.perServingFiber || 0),
    cholesterol: Number(recipe.perServingCholesterol || 0),
    potassium: Number(recipe.perServingPotassium || 0),
    satFat: Number(recipe.perServingSatFat || 0),
    polyFat: Number(recipe.perServingPolyFat || 0),
    monoFat: Number(recipe.perServingMonoFat || 0),
    transFat: Number(recipe.perServingTransFat || 0),
    vitaminA: Number(recipe.perServingVitaminA || 0),
    vitaminC: Number(recipe.perServingVitaminC || 0),
    calcium: Number(recipe.perServingCalcium || 0),
    iron: Number(recipe.perServingIron || 0),
    vitaminB12: Number(recipe.perServingVitaminB12 || 0),
    vitaminD: Number(recipe.perServingVitaminD || 0),
    servingSize: '1 serving',
    unit: 'serving',
    amount: 1,
    numberOfServings: 1,
    isRecipeAggregate: true,
    mealType: currentMealType
  };

  onSelectFood?.(payload, currentMealType);
  showToastNotification?.('Recipe Logged!', `Successfully logged "${recipe.name}" for ${currentMealType}.`, 'success');
};

  const handleSaveAndLogRecipe = (recipe) => {
    handleQuickLogRecipe(recipe, { stopPropagation: () => {} });
    fetchAllInitialData();
  };

  const handleSelectIndividualFood = (item) => {
    const normalized = normalizeItem(item);
    if (!normalized) return;

    if (isSelectingForMeal) {
      const { id, _id, ...draftTarget } = normalized;
      setMealDraftTarget(draftTarget);
      setIsSelectingForMeal(false);
      setIsMealAddDetailOpen(true);
    } else if (isSelectingForRecipe) {
      const { id, _id, ...draftTarget } = normalized;
      setRecipeDraftTarget(draftTarget);
      setIsSelectingForRecipe(false);
      setIsRecipeAddDetailOpen(true);
    } else {
      onSelectFood?.(normalized, currentMealType);
      showToastNotification?.('Food Selected!', `Selected ${normalized.foodName} for ${currentMealType}.`, 'success');
    }
  };

const sortByDate = (list) => {
  return [...list].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });
};

const myMeals = sortByDate(userMeals.filter((m) => m.userId === userId));
const otherPublicMeals = userMeals.filter((m) => m.userId !== userId);

const myRecipes = sortByDate(customRecipes.filter((r) => r.userId === userId));
const otherPublicRecipes = customRecipes.filter((r) => r.userId !== userId);

const myFoods = sortByDate(customFoods.filter((f) => f.createdBy === userId));
const otherPublicFoods = customFoods.filter((f) => f.createdBy !== userId);

const getDisplayList = () => {
  if (searchQuery.trim()) return searchResults;
  if (activeCategoryTab === 'my-foods') return myFoods;
  if (activeCategoryTab === 'my-recipes') return myRecipes;
  if (activeCategoryTab === 'my-meals') return myMeals;
  const combined = [...recentFoods, ...otherPublicMeals, ...otherPublicRecipes];
  return combined.filter((item) => !clearedIds.includes(item._id || item.id));
};

  const displayList = getDisplayList();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="w-full max-w-md bg-[#121A2A] border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh] relative">
          
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 relative z-20">
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center relative">
              <button 
                onClick={() => setIsMealDropdownOpen(!isMealDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#1C2638] transition-colors active:scale-95"
              >
                <span className="text-sm font-black capitalize text-white">{currentMealType}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isMealDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMealDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMealDropdownOpen(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-36 bg-[#161F30] border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col">
                    {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setCurrentMealType(type);
                          setIsMealDropdownOpen(false);
                        }}
                        className={`w-full text-center px-4 py-3 text-xs font-bold transition-all ${
                          currentMealType.toLowerCase() === type.toLowerCase()
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'text-gray-300 hover:bg-[#1C2638] hover:text-white'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="w-5" />
          </div>

          {isSelectingForMeal && (
            <div className="bg-cyan-950/60 border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-300">
                Select an item to add to your meal draft
              </span>
              <button 
                onClick={() => {
                  setIsSelectingForMeal(false);
                  setIsCreateMealOpen(true);
                }}
                className="text-[10px] uppercase font-bold text-cyan-400 underline"
              >
                Back to Meal
              </button>
            </div>
          )}

          {isSelectingForRecipe && (
            <div className="bg-cyan-950/60 border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-300">
                Select an ingredient to add to your recipe
              </span>
              <button 
                onClick={() => {
                  setIsSelectingForRecipe(false);
                  setIsCreateRecipeOpen(true);
                }}
                className="text-[10px] uppercase font-bold text-cyan-400 underline"
              >
                Back to Recipe
              </button>
            </div>
          )}

          <div className="p-4 pb-2 relative z-10">
            <div className="relative flex items-center">
              <input 
                type="text"
                placeholder={
                  activeCategoryTab === 'my-foods' 
                    ? "Search my foods..." 
                    : "Search foods, recipes, entries..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161F30] border border-gray-800/80 rounded-2xl pl-10 pr-10 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-3 p-1 text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center px-4 border-b border-gray-800/60 text-xs font-semibold text-gray-400 overflow-x-auto space-x-6 relative z-10">
            <button 
              onClick={() => { setActiveCategoryTab('all'); setSearchQuery(''); }} 
              className={`py-2.5 relative transition-all ${activeCategoryTab === 'all' ? 'text-white font-bold' : 'hover:text-gray-200'}`}
            >
              All
              {activeCategoryTab === 'all' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />}
            </button>

            <button 
              onClick={() => { setActiveCategoryTab('my-meals'); setSearchQuery(''); }} 
              className={`py-2.5 relative transition-all ${activeCategoryTab === 'my-meals' ? 'text-white font-bold' : 'hover:text-gray-200'}`}
            >
              My Meals
              {activeCategoryTab === 'my-meals' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />}
            </button>

            <button 
              onClick={() => { setActiveCategoryTab('my-recipes'); setSearchQuery(''); }} 
              className={`py-2.5 relative transition-all ${activeCategoryTab === 'my-recipes' ? 'text-white font-bold' : 'hover:text-gray-200'}`}
            >
              My Recipes
              {activeCategoryTab === 'my-recipes' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />}
            </button>

            <button 
              onClick={() => { setActiveCategoryTab('my-foods'); setSearchQuery(''); }} 
              className={`py-2.5 relative transition-all ${activeCategoryTab === 'my-foods' ? 'text-white font-bold' : 'hover:text-gray-200'}`}
            >
              My Foods
              {activeCategoryTab === 'my-foods' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />}
            </button>
          </div>

          {activeCategoryTab === 'my-foods' && !searchQuery && (
            <div className="p-4 pb-2 space-y-4 border-b border-gray-800/40">
                <button 
  onClick={() => onCreateCustomFood?.()}
  className="w-full flex items-center justify-center gap-2 p-4 bg-[#161F30] border border-gray-800 hover:border-cyan-500 rounded-2xl transition-all"
>
  <Plus className="w-5 h-5 text-cyan-400" />
  <span className="text-xs font-bold text-cyan-400">Create a food</span>
</button>


              <div className="flex justify-between items-center">
                <h4 className="text-base font-bold text-white">My Foods</h4>
                <button 
  onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
  className="flex items-center gap-1.5 bg-[#161F30] text-gray-300 px-3.5 py-1.5 rounded-full text-xs font-medium border border-gray-800 hover:border-cyan-500 transition-colors"
>
  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
  <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
</button>
              </div>
            </div>
          )}

          {activeCategoryTab === 'my-meals' && !searchQuery && (
            <div className="p-4 pb-2 border-b border-gray-800/60 space-y-3">
                <button 
  onClick={() => { setEditingMeal(null); setMealItems([]); setIsCreateMealOpen(true); }}
  className="w-full flex items-center justify-center gap-2 p-4 bg-[#161F30] border border-gray-800 hover:border-cyan-500 rounded-2xl transition-all"
>
  <Plus className="w-5 h-5 text-cyan-400" />
  <span className="text-xs font-bold text-cyan-400">Create meal</span>
</button>


              <div className="flex justify-between items-center pt-1">
                <h4 className="text-base font-bold text-white">My Meals</h4>
                <button 
  onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
  className="flex items-center gap-1 bg-[#161F30] text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-800 hover:border-cyan-500 transition-colors"
>
  <ArrowUpDown className="w-3 h-3 text-gray-400" />
  <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
</button>
              </div>
            </div>
          )}

          {activeCategoryTab === 'my-recipes' && !searchQuery && (
            <div className="p-4 pb-2 border-b border-gray-800/60 space-y-3">
              <button 
                onClick={() => { setEditingRecipe(null); setRecipeIngredients([]); setIsCreateRecipeOpen(true); }}
                className="w-full flex items-center justify-center gap-2 p-4 bg-[#161F30] border border-gray-800 hover:border-cyan-500 rounded-2xl transition-all"
              >
                <Plus className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400">Create recipe</span>
              </button>

              <div className="flex justify-between items-center pt-1">
                <h4 className="text-base font-bold text-white">My Recipes</h4>
               <button 
  onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
  className="flex items-center gap-1 bg-[#161F30] text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-800 hover:border-cyan-500 transition-colors"
>
  <ArrowUpDown className="w-3 h-3 text-gray-400" />
  <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 min-h-[220px] pb-6">
            




            {(isSearching || isLoadingTab) && (
              <div className="flex items-center justify-center py-8 text-gray-400 space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="text-xs font-mono">Loading items...</span>
              </div>
            )}

            {!isSearching && !isLoadingTab && displayList.length === 0 && (
              <div className="py-10 text-center text-gray-500">
                <p className="text-xs font-mono">
                  {activeCategoryTab === 'my-meals' 
                    ? 'No meals created yet.' 
                    : activeCategoryTab === 'my-recipes'
                    ? 'No recipes created yet.'
                    : 'No entries found.'}
                </p>
              </div>
            )}

            {!isSearching && !isLoadingTab && activeCategoryTab === 'my-meals' && myMeals.map((meal) => (
              <div
                key={meal._id}
                onClick={() => handleEditMeal(meal)}
                className="w-full text-left flex items-center justify-between bg-[#161F30] border border-gray-800 hover:border-gray-700 p-3.5 rounded-2xl transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700 text-gray-400 overflow-hidden">
                    {meal.photoUrl ? (
                      <img src={meal.photoUrl} alt={meal.name} className="w-full h-full object-cover" />
                    ) : (
                      <Utensils className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">
                      {meal.name}
                    </h5>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {meal.totalCalories || 0} cal, {meal.items?.length || 0} items
                    </p>
                  </div>
                </div>

                <button 
                  onClick={(e) => handleQuickLogMeal(meal, e)}
                  className="w-8 h-8 rounded-full bg-[#1C2638] hover:bg-cyan-600 text-cyan-400 hover:text-white flex items-center justify-center transition-colors"
                  title="Quick Log Meal"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}

            {!isSearching && !isLoadingTab && activeCategoryTab === 'my-recipes' && myRecipes.map((recipe) => (
              <div
                key={recipe._id}
                onClick={() => handleEditRecipe(recipe)}
                className="w-full text-left flex items-center justify-between bg-[#161F30] border border-gray-800 hover:border-gray-700 p-3.5 rounded-2xl transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700 text-gray-400 overflow-hidden">
                    {recipe.photoUrl ? (
                      <img src={recipe.photoUrl} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : (
                      <ChefHat className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">
                      {recipe.name}
                    </h5>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {recipe.perServingCalories || 0} cal/serving • {recipe.servings || 1} servings
                    </p>
                  </div>
                </div>

                <button 
                  onClick={(e) => handleQuickLogRecipe(recipe, e)}
                  className="w-8 h-8 rounded-full bg-[#1C2638] hover:bg-cyan-600 text-cyan-400 hover:text-white flex items-center justify-center transition-colors"
                  title="Quick Log Recipe"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}

            {!isSearching && !isLoadingTab && activeCategoryTab === 'all' && !searchQuery && displayList.length > 0 && (
  <div className="flex items-center justify-between mb-2 pt-2">
    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recently Logged</h4>
    <button
  onClick={() => {
    const currentIds = [...recentFoods, ...otherPublicMeals, ...otherPublicRecipes]
      .map((item) => item._id || item.id)
      .filter(Boolean);
    const merged = Array.from(new Set([...clearedIds, ...currentIds]));
    setClearedIds(merged);
    if (userId) localStorage.setItem(`recentClearedIds_${userId}`, JSON.stringify(merged));
  }}
  className="text-[10px] uppercase font-bold text-gray-500 hover:text-red-400 transition-colors"
>
  Clear
</button>
  </div>
)}

            {!isSearching && !isLoadingTab && activeCategoryTab !== 'my-meals' && activeCategoryTab !== 'my-recipes' && displayList.map((item, index) => {
  const isMeal = item.totalCalories !== undefined && item.items !== undefined;
  const isRecipe = item.perServingCalories !== undefined;
  const isCustomFood = activeCategoryTab === 'my-foods';

  let name, subtext, Icon, onRowClick, onQuickAdd;

  if (isMeal) {
    name = item.name;
    subtext = `${item.totalCalories || 0} cal, ${item.items?.length || 0} items`;
    Icon = Utensils;
    onRowClick = (e) => handleQuickLogMeal(item, e);
    onQuickAdd = (e) => handleQuickLogMeal(item, e);
  } else if (isRecipe) {
    name = item.name;
    subtext = `${item.perServingCalories || 0} cal/serving • ${item.servings || 1} servings`;
    Icon = ChefHat;
    onRowClick = (e) => handleQuickLogRecipe(item, e);
    onQuickAdd = (e) => handleQuickLogRecipe(item, e);
  } else {
    const normalized = normalizeItem(item);
    name = normalized.foodName;
    // Show the food's real-world serving size (defaultServingAmount) rather
    // than the internal calculation reference (amount, which is 100 for
    // API-sourced foods since their nutrition values are per-100g).
    // Calories at that real serving are scaled down from the per-`amount`
    // reference value so the number shown matches the number the user will
    // actually get if they log it at the default serving.
    const scaleToDefault = normalized.amount > 0 ? normalized.defaultServingAmount / normalized.amount : 1;
    const displayCalories = Math.round((normalized.calories || 0) * scaleToDefault);
    subtext = `${displayCalories} cal, ${normalized.defaultServingAmount}${normalized.unit}, ${item.brandName || item.brand || name}`;
    Icon = null;
    onRowClick = () => {
      if (isCustomFood && !isSelectingForMeal && !isSelectingForRecipe) {
        onCreateCustomFood?.(item);
      } else {
        handleSelectIndividualFood(item);
      }
    };
    onQuickAdd = (e) => { e.stopPropagation(); handleSelectIndividualFood(item); };
  }

  return (
    <div
      key={item._id || item.id || index}
      onClick={(e) => onRowClick(e)}
      className="w-full text-left flex justify-between items-center bg-[#161F30]/60 border border-gray-800/80 hover:border-gray-700/80 p-3.5 rounded-2xl hover:bg-[#161F30] transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
        {Icon && (
          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700 text-gray-400 min-h-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <span className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate block">
            {name}
          </span>
          <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 min-h-0">
        {isCustomFood && !isMeal && !isRecipe && !isSelectingForMeal && !isSelectingForRecipe && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteCustomFood?.(item._id || item.id, name); }}
            className="w-8 h-8 rounded-full bg-[#1C2638] hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors"
            title="Delete Custom Food"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onQuickAdd}
          className="w-8 h-8 rounded-full bg-[#1C2638] hover:bg-cyan-500 text-cyan-400 hover:text-white flex items-center justify-center transition-colors"
          title="Add"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
})}
          </div>

        </div>
      </div>

      <FoodDetailModal
        isOpen={isMealAddDetailOpen}
        foodName={mealDraftTarget?.foodName}
        mealType={currentMealType}
        initialData={mealDraftTarget}
        showToastNotification={showToastNotification}
        onClose={() => {
          setIsMealAddDetailOpen(false);
          setMealDraftTarget(null);
          setIsCreateMealOpen(true);
        }}
        onConfirmLog={handleConfirmMealDraftItem}
        onUpdateLog={() => {}}
      />

      <CreateMealModal 
        isOpen={isCreateMealOpen}
        userId={userId}
        existingMeal={editingMeal}
        mealItems={mealItems}
        setMealItems={setMealItems}
        showToastNotification={showToastNotification}
        onOpenFoodLog={() => {
          setIsCreateMealOpen(false);
          setIsSelectingForMeal(true);
        }}
        onClose={() => {
          setIsCreateMealOpen(false);
          setMealItems([]);
          setEditingMeal(null);
        }}
        onSave={() => {
          setIsCreateMealOpen(false);
          setMealItems([]);
          setEditingMeal(null);
          fetchAllInitialData();
        }}
        onDeleteMeal={handleDeleteMeal}
      />

      <FoodDetailModal
        isOpen={isRecipeAddDetailOpen}
        foodName={recipeDraftTarget?.foodName}
        mealType={currentMealType}
        initialData={recipeDraftTarget}
        showToastNotification={showToastNotification}
        onClose={() => {
          setIsRecipeAddDetailOpen(false);
          setRecipeDraftTarget(null);
          setIsCreateRecipeOpen(true);
        }}
        onConfirmLog={handleConfirmRecipeDraftIngredient}
        onUpdateLog={() => {}}
      />

      <CreateRecipeModal
        isOpen={isCreateRecipeOpen}
        userId={userId}
        existingRecipe={editingRecipe}
        ingredients={recipeIngredients}
        setIngredients={setRecipeIngredients}
        showToastNotification={showToastNotification}
        onOpenFoodLog={() => {
          setIsCreateRecipeOpen(false);
          setIsSelectingForRecipe(true);
        }}
        onClose={() => {
          setIsCreateRecipeOpen(false);
          setRecipeIngredients([]);
          setEditingRecipe(null);
        }}
        onSave={() => {
          setIsCreateRecipeOpen(false);
          setRecipeIngredients([]);
          setEditingRecipe(null);
          fetchAllInitialData();
        }}
        onSaveAndLog={(recipe) => {
          setIsCreateRecipeOpen(false);
          setRecipeIngredients([]);
          setEditingRecipe(null);
          handleSaveAndLogRecipe(recipe);
        }}
        onDeleteRecipe={handleDeleteRecipe}
      />
    </>
  );
}