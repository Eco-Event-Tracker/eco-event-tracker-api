/**
 * Example usage of the Catering Emission calculator
 * Run with: npx ts-node catering.example.ts
 */

import { calculateCateringEmissions, estimateCateringEmissions, CateringItem } from "./catering.service.js";

export default function TestCateringCalculation() {
  var log = "";

  // -------------------------------------------------------------------------
  // Test 1: Full-day conference — breakfast + lunch + afternoon break
  // 200 attendees, mixed diet profile
  // -------------------------------------------------------------------------
  log += "=== Test 1: Full-day conference, 200 attendees ===\n\n";

  const scenario1: CateringItem[] = [
    // Breakfast
    { category: "beverage", type: "coffee_with_milk", servings: 160 },
    { category: "beverage", type: "coffee_black",     servings: 40  },
    { category: "beverage", type: "tea",              servings: 80  },
    { category: "snack",    type: "pastry",           servings: 200 },
    { category: "snack",    type: "fruit",            servings: 200 },

    // Lunch — realistic mixed diet split for Nigerian professional event
    { category: "meal", type: "high_meat",   servings: 100 }, // 50% high meat
    { category: "meal", type: "medium_meat", servings: 60  }, // 30% medium meat
    { category: "meal", type: "vegetarian",  servings: 30  }, // 15% vegetarian
    { category: "meal", type: "vegan",       servings: 10  }, // 5% vegan
    { category: "beverage", type: "water_bottle", servings: 200 },
    { category: "beverage", type: "soft_drink",   servings: 100 },

    // Afternoon break
    { category: "beverage", type: "coffee_with_milk", servings: 150 },
    { category: "beverage", type: "tea",              servings: 50  },
    { category: "snack",    type: "biscuits",         servings: 200 },
  ];

  const r1 = calculateCateringEmissions(scenario1);

  log += `Total emissions : ${r1.totalKgCO2e} kg CO2e\n`;
  log += `Per person      : ${(r1.totalKgCO2e / 200).toFixed(2)} kg CO2e\n\n`;
  log += "--- By Category ---\n";
  log += `  Meals     : ${r1.byCategory.meals} kg CO2e\n`;
  log += `  Beverages : ${r1.byCategory.beverages} kg CO2e\n`;
  log += `  Snacks    : ${r1.byCategory.snacks} kg CO2e\n\n`;
  log += "--- By Item ---\n";
  r1.byItem.forEach(({ type, servings, kgCO2ePerServing, totalKgCO2e }) => {
    log += `  ${String(servings).padStart(4)}× ${type.padEnd(50)}: ${kgCO2ePerServing} × ${servings} = ${totalKgCO2e.toFixed(3)} kg CO2e\n`;
  });
  log += "\n--- Notes ---\n";
  r1.notes.forEach((n) => (log += `  • ${n}\n`));

  // -------------------------------------------------------------------------
  // Test 2: Vegetarian-heavy event (sustainability-focused conference)
  // -------------------------------------------------------------------------
  log += "\n=== Test 2: Sustainability conference, 150 attendees, plant-forward menu ===\n\n";

  const scenario2: CateringItem[] = [
    { category: "meal", type: "vegan",        servings: 75 },  // 50%
    { category: "meal", type: "vegetarian",   servings: 60 },  // 40%
    { category: "meal", type: "pescatarian",  servings: 15 },  // 10%
    { category: "beverage", type: "coffee_with_milk", servings: 150 },
    { category: "beverage", type: "tea",              servings: 75  },
    { category: "snack",    type: "buffet_veg",       servings: 150 },
  ];

  const r2 = calculateCateringEmissions(scenario2);

  log += `Total emissions : ${r2.totalKgCO2e} kg CO2e\n`;
  log += `Per person      : ${(r2.totalKgCO2e / 150).toFixed(2)} kg CO2e\n\n`;
  log += "--- By Category ---\n";
  log += `  Meals     : ${r2.byCategory.meals} kg CO2e\n`;
  log += `  Beverages : ${r2.byCategory.beverages} kg CO2e\n`;
  log += `  Snacks    : ${r2.byCategory.snacks} kg CO2e\n\n`;
  log += "--- Notes ---\n";
  r2.notes.forEach((n) => (log += `  • ${n}\n`));

  // -------------------------------------------------------------------------
  // Test 3: Simple estimate — just meals for a gala dinner, 500 guests
  // -------------------------------------------------------------------------
  log += "\n=== Test 3: Gala dinner, 500 guests, mixed buffet ===\n\n";

  const scenario3: CateringItem[] = [
    { category: "meal",     type: "high_meat",        servings: 300 },
    { category: "meal",     type: "vegetarian",       servings: 200 },
    { category: "beverage", type: "water_bottle",     servings: 500 },
    { category: "snack",    type: "buffet_mixed",     servings: 500 },
  ];

  const r3 = calculateCateringEmissions(scenario3);

  log += `Total emissions : ${r3.totalKgCO2e} kg CO2e\n`;
  log += `Per person      : ${(r3.totalKgCO2e / 500).toFixed(2)} kg CO2e\n\n`;
  log += "--- Notes ---\n";
  r3.notes.forEach((n) => (log += `  • ${n}\n`));

  // -------------------------------------------------------------------------
  // Test 4: Diet comparison — same 100 meals, different menu choices
  // -------------------------------------------------------------------------
  log += "\n=== Test 4: Menu comparison — 100 meals, 4 diet scenarios ===\n\n";

  const mealTypes = ["vegan", "vegetarian", "pescatarian", "low_meat", "medium_meat", "high_meat"] as const;
  log += `${"Diet type".padEnd(16)} | kg CO2e | kg CO2e/meal\n`;
  log += `${"-".repeat(44)}\n`;
  for (const t of mealTypes) {
    const r = calculateCateringEmissions([{ category: "meal", type: t, servings: 100 }]);
    log += `${t.padEnd(16)} | ${r.totalKgCO2e.toFixed(2).padStart(7)} | ${(r.totalKgCO2e / 100).toFixed(2)}\n`;
  }

  log += `\nSource: ${r1.source}\n`;

  // -------------------------------------------------------------------------
  // Test 5: Estimate from servings count only — no menu detail
  // -------------------------------------------------------------------------
  log += "\n=== Test 5: Estimate from servings count only ===\n\n";

  const estimates = [50, 200, 500, 1000];
  log += `${"Servings".padEnd(10)} | ${"kg CO2e".padEnd(10)} | kg CO2e/serving\n`;
  log += `${"-".repeat(42)}\n`;
  for (const s of estimates) {
    const { totalKgCO2e, kgCO2ePerServing } = estimateCateringEmissions(s);
    log += `${String(s).padEnd(10)} | ${totalKgCO2e.toFixed(2).padEnd(10)} | ${kgCO2ePerServing}\n`;
  }

  const { note } = estimateCateringEmissions(200);
  log += `\nAssumption: ${note}\n`;

  return log;
}