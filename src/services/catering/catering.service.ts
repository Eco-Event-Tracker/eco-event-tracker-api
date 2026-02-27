/**
 * Catering Emission Calculator
 *
 * Estimates CO2e emissions from event catering — meals, beverages and snacks —
 * at the per-serving level.
 *
 * --- Emission Factors & Sources ---
 *
 * MEALS (kg CO2e per meal, full plate including sides):
 *
 *   Diet type        kg CO2e/meal   Basis
 *   ─────────────────────────────────────────────────────────────────────────
 *   vegan            0.96           Scarborough et al. 2023 (Nature Food),
 *                                   n=55,504 UK adults. Daily vegan GHG =
 *                                   2.89 kg CO2e/day ÷ 3 meals/day.
 *   vegetarian       1.27           Scarborough et al. 2023. Daily =
 *                                   3.81 kg CO2e/day ÷ 3.
 *   pescatarian      1.30           Scarborough et al. 2023. Daily =
 *                                   3.91 kg CO2e/day ÷ 3.
 *   low_meat         1.56           Scarborough et al. 2023. Daily = 4.67 ÷ 3.
 *                                   (<50 g meat/day group)
 *   medium_meat      1.88           Scarborough et al. 2023. Daily = 5.63 ÷ 3.
 *                                   (50–99 g/day group)
 *   high_meat        2.40           Scarborough et al. 2023. Daily = 7.19 ÷ 3.
 *                                   (≥100 g/day group)
 *
 *   Note on meal conversion: Scarborough et al. report whole-day dietary GHG.
 *   Dividing by 3 gives a per-meal proxy. For single-meal events (e.g. a gala
 *   dinner), this is appropriate. For half-day events with one meal + snacks,
 *   use meal + snack items separately.
 *
 *   Reference: Scarborough, P. et al. "Vegans, vegetarians, fish-eaters and
 *   meat-eaters in the UK show discrepant environmental impacts."
 *   Nature Food 4, 565–574 (2023). https://doi.org/10.1038/s43016-023-00795-w
 *   (CC BY 4.0)
 *
 * BEVERAGES (kg CO2e per serving):
 *
 *   coffee_with_milk  0.28   Weighted avg of latte/flat white/cappuccino
 *                            (Groundwork Coffee / Twomey et al. 2021)
 *   coffee_black      0.04   Black espresso/Americano. Ibid.
 *   tea               0.013  Per cup incl. black tea + small milk splash.
 *                            Circular Ecology LCA 2022; WWF Sweden 2022.
 *   juice             0.10   Orange juice per 200 ml serving.
 *                            Poore & Nemecek 2018 (citrus, processing).
 *   water_bottle      0.12   500 ml PET bottle incl. packaging.
 *                            Ecoinvent / DEFRA material consumption factors.
 *   soft_drink        0.08   Carbonated soft drink 330 ml can.
 *                            Ibid., avg of cola/flavoured variants.
 *
 * SNACKS (kg CO2e per serving / portion):
 *
 *   fruit             0.10   Mixed seasonal fruit portion (~100 g).
 *                            Poore & Nemecek 2018 (fruit, avg).
 *   pastry            0.25   Croissant/pain au chocolat (~80 g).
 *                            Dairy + wheat; Poore & Nemecek 2018.
 *   biscuits          0.20   Two biscuits/cookies (~40 g).
 *                            Ibid., processed cereal + sugar + fat.
 *   sandwich          1.10   Standard sandwich (bread + filling).
 *                            Mixed meat/cheese/veg filling avg;
 *                            Carbon Trust event catering estimates.
 *   buffet_mixed      0.55   Light buffet portion (finger food, mixed).
 *                            Mid-point estimate: veg-based ~ 0.30,
 *                            meat-based ~ 0.80; avg = 0.55.
 *   buffet_veg        0.30   Vegetarian buffet portion.
 *
 * Framework: GHG Protocol Scope 3 Category 1 (purchased goods and services).
 * All factors cover farm-to-fork (production, processing, transport, packaging).
 * Cooking/preparation energy at the event venue is excluded; add power emissions
 * separately via power.service.ts if catering is prepared on-site.
 *
 * Limitations:
 * - Factors are global/UK averages. Local sourcing, seasonality, and organic
 *   certification can shift individual dish footprints by ±30–50%.
 * - "Meal" factors are derived from whole-day diet studies divided by 3.
 *   High-production or unusual menus may differ substantially.
 * - Beverage and snack factors are indicative mid-points; use custom items
 *   for higher precision.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MealType =
  | "vegan"
  | "vegetarian"
  | "pescatarian"
  | "low_meat"
  | "medium_meat"
  | "high_meat";

export type BeverageType =
  | "coffee_with_milk"
  | "coffee_black"
  | "tea"
  | "juice"
  | "water_bottle"
  | "soft_drink";

export type SnackType =
  | "fruit"
  | "pastry"
  | "biscuits"
  | "sandwich"
  | "buffet_mixed"
  | "buffet_veg";

/**
 * A single catering line item.
 * Represents a batch of one item type served at the event.
 */
export interface CateringItem {
  /** Category of the item */
  category: "meal" | "beverage" | "snack";
  /** Specific type within the category */
  type: MealType | BeverageType | SnackType;
  /** Number of servings */
  servings: number;
}

export interface CateringItemBreakdown {
  category: "meal" | "beverage" | "snack";
  type: string;
  servings: number;
  kgCO2ePerServing: number;
  totalKgCO2e: number;
}

export interface CateringEmissionResult {
  totalKgCO2e: number;
  byItem: CateringItemBreakdown[];
  byCategory: {
    meals: number;
    beverages: number;
    snacks: number;
  };
  source: string;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Emission factors
// ---------------------------------------------------------------------------

const MEAL_FACTORS: Record<MealType, { kgCO2ePerServing: number; label: string }> = {
  vegan:       { kgCO2ePerServing: 0.96, label: "Vegan" },
  vegetarian:  { kgCO2ePerServing: 1.27, label: "Vegetarian" },
  pescatarian: { kgCO2ePerServing: 1.30, label: "Pescatarian/fish-eater" },
  low_meat:    { kgCO2ePerServing: 1.56, label: "Low-meat (<50 g/day)" },
  medium_meat: { kgCO2ePerServing: 1.88, label: "Medium-meat (50–99 g/day)" },
  high_meat:   { kgCO2ePerServing: 2.40, label: "High-meat (≥100 g/day)" },
};

const BEVERAGE_FACTORS: Record<BeverageType, { kgCO2ePerServing: number; label: string }> = {
  coffee_with_milk: { kgCO2ePerServing: 0.28,  label: "Coffee with milk (latte/flat white/cappuccino)" },
  coffee_black:     { kgCO2ePerServing: 0.04,  label: "Black coffee (espresso/Americano)" },
  tea:              { kgCO2ePerServing: 0.013, label: "Tea (with small milk splash)" },
  juice:            { kgCO2ePerServing: 0.10,  label: "Fruit juice (200 ml serving)" },
  water_bottle:     { kgCO2ePerServing: 0.12,  label: "Bottled water (500 ml PET)" },
  soft_drink:       { kgCO2ePerServing: 0.08,  label: "Soft drink (330 ml can)" },
};

const SNACK_FACTORS: Record<SnackType, { kgCO2ePerServing: number; label: string }> = {
  fruit:         { kgCO2ePerServing: 0.10, label: "Fruit portion (~100 g)" },
  pastry:        { kgCO2ePerServing: 0.25, label: "Pastry (croissant/pain au chocolat)" },
  biscuits:      { kgCO2ePerServing: 0.20, label: "Biscuits/cookies (2 pieces)" },
  sandwich:      { kgCO2ePerServing: 1.10, label: "Sandwich (mixed filling)" },
  buffet_mixed:  { kgCO2ePerServing: 0.55, label: "Mixed buffet portion (finger food)" },
  buffet_veg:    { kgCO2ePerServing: 0.30, label: "Vegetarian buffet portion" },
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_MEAL_TYPES = new Set(Object.keys(MEAL_FACTORS));
const VALID_BEVERAGE_TYPES = new Set(Object.keys(BEVERAGE_FACTORS));
const VALID_SNACK_TYPES = new Set(Object.keys(SNACK_FACTORS));

function validateItem(item: CateringItem, index: number): void {
  if (!["meal", "beverage", "snack"].includes(item.category)) {
    throw new Error(
      `Item ${index}: invalid category "${item.category}". Must be "meal", "beverage", or "snack".`
    );
  }
  if (item.category === "meal" && !VALID_MEAL_TYPES.has(item.type)) {
    throw new Error(
      `Item ${index}: invalid meal type "${item.type}". Valid: ${[...VALID_MEAL_TYPES].join(", ")}`
    );
  }
  if (item.category === "beverage" && !VALID_BEVERAGE_TYPES.has(item.type)) {
    throw new Error(
      `Item ${index}: invalid beverage type "${item.type}". Valid: ${[...VALID_BEVERAGE_TYPES].join(", ")}`
    );
  }
  if (item.category === "snack" && !VALID_SNACK_TYPES.has(item.type)) {
    throw new Error(
      `Item ${index}: invalid snack type "${item.type}". Valid: ${[...VALID_SNACK_TYPES].join(", ")}`
    );
  }
  if (!Number.isFinite(item.servings) || item.servings < 0) {
    throw new Error(`Item ${index}: servings must be a non-negative number, got ${item.servings}`);
  }
}

function getFactor(item: CateringItem): { kgCO2ePerServing: number; label: string } {
  if (item.category === "meal") {
    return MEAL_FACTORS[item.type as MealType];
  }
  if (item.category === "beverage") {
    return BEVERAGE_FACTORS[item.type as BeverageType];
  }
  return SNACK_FACTORS[item.type as SnackType];
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

/**
 * Calculates CO2e emissions from event catering.
 *
 * Accepts an array of catering line items (meals, beverages, snacks) and
 * returns total emissions with a full breakdown.
 *
 * @param items - Array of catering items
 * @returns CateringEmissionResult with total, per-item and per-category breakdown
 *
 * @example
 * // 200-person conference lunch + coffee break
 * calculateCateringEmissions([
 *   { category: "meal",     type: "vegetarian",    servings: 120 },
 *   { category: "meal",     type: "vegan",         servings: 30  },
 *   { category: "meal",     type: "medium_meat",   servings: 50  },
 *   { category: "beverage", type: "coffee_with_milk", servings: 200 },
 *   { category: "beverage", type: "water_bottle",  servings: 200 },
 *   { category: "snack",    type: "pastry",        servings: 200 },
 * ]);
 *
 * @example
 * // Simple: just count participants, assume average mixed diet
 * calculateCateringEmissions([
 *   { category: "meal", type: "medium_meat", servings: 300 },
 * ]);
 */
export function calculateCateringEmissions(
  items: CateringItem[]
): CateringEmissionResult {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items must be a non-empty array");
  }

  items.forEach((item, i) => validateItem(item, i));

  // Calculate per-item emissions
  const byItem: CateringItemBreakdown[] = items.map((item) => {
    const { kgCO2ePerServing, label } = getFactor(item);
    return {
      category: item.category,
      type: `${item.type} — ${label}`,
      servings: item.servings,
      kgCO2ePerServing,
      totalKgCO2e: Math.round(item.servings * kgCO2ePerServing * 1000) / 1000,
    };
  });

  // Aggregate by category
  const mealsKgCO2e    = byItem.filter(i => i.category === "meal")     .reduce((s, i) => s + i.totalKgCO2e, 0);
  const beveragesKgCO2e= byItem.filter(i => i.category === "beverage") .reduce((s, i) => s + i.totalKgCO2e, 0);
  const snacksKgCO2e   = byItem.filter(i => i.category === "snack")    .reduce((s, i) => s + i.totalKgCO2e, 0);
  const totalKgCO2e    = mealsKgCO2e + beveragesKgCO2e + snacksKgCO2e;

  // Contextual notes
  const notes: string[] = [];

  // Meal diet mix analysis
  const mealItems = items.filter(i => i.category === "meal");
  const totalMealServings = mealItems.reduce((s, i) => s + i.servings, 0);

  if (totalMealServings > 0) {
    const highMeatServings = mealItems
      .filter(i => i.type === "high_meat" || i.type === "medium_meat")
      .reduce((s, i) => s + i.servings, 0);
    const plantServings = mealItems
      .filter(i => i.type === "vegan" || i.type === "vegetarian")
      .reduce((s, i) => s + i.servings, 0);

    const highMeatPct = (highMeatServings / totalMealServings) * 100;
    const plantPct = (plantServings / totalMealServings) * 100;

    if (highMeatPct > 50) {
      // Calculate what emissions would be if all meals were vegetarian
      const vegetarianOnlyKgCO2e = totalMealServings * MEAL_FACTORS["vegetarian"].kgCO2ePerServing;
      const saving = mealsKgCO2e - vegetarianOnlyKgCO2e;
      notes.push(
        `${highMeatPct.toFixed(0)}% of meals are medium or high-meat. ` +
          `Shifting all meals to vegetarian would reduce meal emissions by ` +
          `~${saving.toFixed(1)} kg CO2e (${((saving / mealsKgCO2e) * 100).toFixed(0)}%).`
      );
    }

    if (plantPct > 60) {
      notes.push(
        `${plantPct.toFixed(0)}% of meals are plant-based (vegan/vegetarian) — ` +
          "a low-impact catering choice. Well done."
      );
    }

    const avgKgCO2ePerMeal = mealsKgCO2e / totalMealServings;
    notes.push(
      `Average meal footprint: ${avgKgCO2ePerMeal.toFixed(2)} kg CO2e/meal ` +
        `across ${totalMealServings} servings.`
    );
  }

  // Bottled water note
  const waterItems = items.filter(i => i.type === "water_bottle");
  if (waterItems.length > 0) {
    const waterServings = waterItems.reduce((s, i) => s + i.servings, 0);
    const waterKgCO2e = waterItems.reduce((s, i) => {
      return s + i.servings * BEVERAGE_FACTORS["water_bottle"].kgCO2ePerServing;
    }, 0);
    notes.push(
      `${waterServings} bottles of water contribute ${waterKgCO2e.toFixed(2)} kg CO2e ` +
        `(mostly PET packaging). Providing tap water or refillable dispensers eliminates this.`
    );
  }

  // Meals dominate vs beverages/snacks
  if (totalKgCO2e > 0) {
    const mealShare = (mealsKgCO2e / totalKgCO2e) * 100;
    if (mealShare > 80) {
      notes.push(
        `Meals account for ${mealShare.toFixed(0)}% of catering emissions. ` +
          "Beverage and snack choices have relatively minor impact compared to meal type selection."
      );
    }
  }

  notes.push(
    "Meal factors derived from Scarborough et al. 2023 (Nature Food, n=55,504), " +
      "whole-day dietary GHG divided by 3 meals/day. Beverage factors: " +
      "Twomey et al. 2021 / WWF Sweden 2022 / Circular Ecology LCA 2022. " +
      "Snack factors: Poore & Nemecek 2018 / Carbon Trust event catering estimates. " +
      "All factors cover farm-to-fork; on-site cooking energy excluded."
  );

  return {
    totalKgCO2e: Math.round(totalKgCO2e * 1000) / 1000,
    byItem,
    byCategory: {
      meals:     Math.round(mealsKgCO2e     * 1000) / 1000,
      beverages: Math.round(beveragesKgCO2e * 1000) / 1000,
      snacks:    Math.round(snacksKgCO2e    * 1000) / 1000,
    },
    source:
      "Scarborough et al. (2023) Nature Food (meals); " +
      "Poore & Nemecek (2018) Science (ingredients); " +
      "Circular Ecology / WWF Sweden (beverages); " +
      "GHG Protocol Scope 3 Category 1",
    notes,
  };
}

// ---------------------------------------------------------------------------
// Convenience estimator — servings only
// ---------------------------------------------------------------------------

/**
 * Default diet profile applied when only a serving count is known.
 * Based on a broad mixed-attendance event (corporate/professional context).
 * Proportions sum to 1.0.
 */
const DEFAULT_DIET_PROFILE: Array<{ type: MealType; share: number }> = [
  { type: "high_meat",   share: 0.40 },
  { type: "medium_meat", share: 0.25 },
  { type: "low_meat",    share: 0.15 },
  { type: "vegetarian",  share: 0.15 },
  { type: "vegan",       share: 0.05 },
];

/**
 * Estimates catering emissions from a serving count alone.
 *
 * Applies a default mixed diet profile — no menu detail required.
 * Returns a single `totalKgCO2e` and the implied `kgCO2ePerServing` so
 * callers can display both numbers simply.
 *
 * Use `calculateCateringEmissions()` when the actual menu breakdown is known.
 *
 * @param servings - Number of meal servings to estimate for
 * @returns `{ totalKgCO2e, kgCO2ePerServing, note }`
 *
 * @example
 * const { totalKgCO2e, kgCO2ePerServing } = estimateCateringEmissions(300);
 * // totalKgCO2e ≈ 568.5, kgCO2ePerServing ≈ 1.895
 */
export function estimateCateringEmissions(servings: number): {
  totalKgCO2e: number;
  kgCO2ePerServing: number;
  note: string;
} {
  if (!Number.isFinite(servings) || servings <= 0) {
    throw new Error("servings must be a positive number");
  }

  const kgCO2ePerServing = DEFAULT_DIET_PROFILE.reduce(
    (sum, { type, share }) => sum + MEAL_FACTORS[type].kgCO2ePerServing * share,
    0
  );

  const totalKgCO2e = Math.round(servings * kgCO2ePerServing * 1000) / 1000;

  return {
    totalKgCO2e,
    kgCO2ePerServing: Math.round(kgCO2ePerServing * 1000) / 1000,
    note:
      `Estimated using default diet profile: ` +
      DEFAULT_DIET_PROFILE.map(
        ({ type, share }) => `${(share * 100).toFixed(0)}% ${type.replace("_", "-")}`
      ).join(", ") +
      ". Use calculateCateringEmissions() with actual menu data for higher accuracy.",
  };
}