/**
 * Waste Emission Calculator
 *
 * Calculates CO2e emissions from event waste using DEFRA/DESNZ 2024
 * Greenhouse Gas Conversion Factors for Company Reporting (Section 12).
 *
 * Source: UK Department for Energy Security and Net Zero (DESNZ), 2024.
 * Licensed under the Open Government Licence v3.0.
 * https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024
 *
 * Methodology notes:
 * - All factors are in kg CO2e per tonne of waste.
 * - Recycling and incineration factors reflect transport to facility only.
 *   Downstream processing emissions are attributed to the processor (GHG Protocol Scope 3).
 * - Landfill and composting factors are material-specific (biogenic decomposition included).
 * - Inputs are accepted in grams (g) and converted internally to tonnes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WasteType =
  | "food"
  | "paper_cardboard"
  | "plastic"
  | "glass"
  | "metal"
  | "mixed";

export type DisposalMethod =
  | "landfill"
  | "incineration"
  | "recycling"
  | "composting";

export interface WasteItem {
  wasteType: WasteType;
  disposalMethod: DisposalMethod;
  /** Quantity of waste in grams (g) */
  quantityG: number;
}

export interface WasteTypeBreakdown {
  wasteType: WasteType;
  totalKgCO2e: number;
}

export interface DisposalMethodBreakdown {
  disposalMethod: DisposalMethod;
  totalKgCO2e: number;
}

export interface WasteEmissionResult {
  /** Total emissions across all waste items */
  totalKgCO2e: number;
  /** Emissions grouped by waste type */
  byWasteType: WasteTypeBreakdown[];
  /** Emissions grouped by disposal method */
  byDisposalMethod: DisposalMethodBreakdown[];
  /** Source attribution */
  source: string;
  /** Year of emission factors used */
  factorYear: number;
}

// ---------------------------------------------------------------------------
// DEFRA 2024 Emission Factors (kg CO2e per tonne)
// Source: DESNZ 2024 GHG Conversion Factors, Section 12: Waste Disposal
// ---------------------------------------------------------------------------

/**
 * Emission factors matrix: emissionFactors[wasteType][disposalMethod]
 * Units: kg CO2e per tonne of waste
 *
 * Notes:
 * - Recycling & incineration: transport-to-facility factor only (~21.3 kg CO2e/tonne),
 *   as per DEFRA methodology and GHG Protocol Scope 3 Category 5 guidance.
 * - Composting is only applicable to organic/food waste; other types fall back to landfill.
 * - "mixed" uses weighted average factors for typical mixed municipal solid waste.
 */
const EMISSION_FACTORS: Record<WasteType, Record<DisposalMethod, number>> = {
  food: {
    landfill: 578.0, // High due to methane from anaerobic decomposition
    incineration: 21.3, // Transport only (biogenic CO2 not counted)
    recycling: 0.0, // Food waste is not typically recycled
    composting: 116.0, // Process releases CH4 and N2O
  },
  paper_cardboard: {
    landfill: 1453.0, // High methane potential from cellulose decomposition
    incineration: 21.3, // Transport only
    recycling: 21.3, // Transport only (net benefit attributed to processor)
    composting: 116.0, // Treated similarly to organics
  },
  plastic: {
    landfill: 33.0, // Plastic is largely inert in landfill
    incineration: 21.3, // Transport only (fossil CO2 from combustion attributed downstream)
    recycling: 21.3, // Transport only
    composting: 21.3, // Not compostable; use transport factor as floor
  },
  glass: {
    landfill: 1.2, // Almost inert — very low emissions
    incineration: 21.3, // Transport only
    recycling: 21.3, // Transport only
    composting: 21.3, // Not compostable; use transport factor as floor
  },
  metal: {
    landfill: 1.2, // Inert in landfill
    incineration: 21.3, // Transport only
    recycling: 21.3, // Transport only
    composting: 21.3, // Not compostable; use transport factor as floor
  },
  mixed: {
    // Weighted average for typical mixed municipal solid waste (MSW)
    landfill: 467.0,
    incineration: 21.3,
    recycling: 21.3,
    composting: 116.0,
  },
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_WASTE_TYPES = new Set<WasteType>([
  "food",
  "paper_cardboard",
  "plastic",
  "glass",
  "metal",
  "mixed",
]);

const VALID_DISPOSAL_METHODS = new Set<DisposalMethod>([
  "landfill",
  "incineration",
  "recycling",
  "composting",
]);

function validateWasteItem(item: WasteItem, index: number): void {
  if (!VALID_WASTE_TYPES.has(item.wasteType)) {
    throw new Error(
      `Item ${index}: invalid wasteType "${item.wasteType}". ` +
        `Valid types: ${[...VALID_WASTE_TYPES].join(", ")}`
    );
  }
  if (!VALID_DISPOSAL_METHODS.has(item.disposalMethod)) {
    throw new Error(
      `Item ${index}: invalid disposalMethod "${item.disposalMethod}". ` +
        `Valid methods: ${[...VALID_DISPOSAL_METHODS].join(", ")}`
    );
  }
  if (typeof item.quantityG !== "number" || item.quantityG < 0) {
    throw new Error(
      `Item ${index}: quantityG must be a non-negative number, got "${item.quantityG}"`
    );
  }
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Calculates CO2e emissions from a list of waste items.
 *
 * @param wasteItems - Array of waste entries, each with type, disposal method, and quantity in grams
 * @returns WasteEmissionResult with total and breakdowns by type and disposal method
 *
 * @example
 * const result = calculateWasteEmissions([
 *   { wasteType: "food", disposalMethod: "composting", quantityG: 50000 },
 *   { wasteType: "plastic", disposalMethod: "recycling", quantityG: 10000 },
 *   { wasteType: "paper_cardboard", disposalMethod: "landfill", quantityG: 20000 },
 * ]);
 * console.log(result.totalKgCO2e);
 */
export function calculateWasteEmissions(
  wasteItems: WasteItem[]
): WasteEmissionResult {
  if (!Array.isArray(wasteItems) || wasteItems.length === 0) {
    throw new Error("wasteItems must be a non-empty array");
  }

  // Validate all items upfront
  wasteItems.forEach((item, i) => validateWasteItem(item, i));

  // Accumulators
  const byTypeMap = new Map<WasteType, number>();
  const byMethodMap = new Map<DisposalMethod, number>();
  let totalKgCO2e = 0;

  for (const item of wasteItems) {
    // Convert grams → tonnes
    const tonnes = item.quantityG / 1_000_000;

    // Look up emission factor
    const factor = EMISSION_FACTORS[item.wasteType][item.disposalMethod];

    // Calculate emissions for this item
    const kgCO2e = tonnes * factor;

    // Accumulate totals
    totalKgCO2e += kgCO2e;
    byTypeMap.set(item.wasteType, (byTypeMap.get(item.wasteType) ?? 0) + kgCO2e);
    byMethodMap.set(
      item.disposalMethod,
      (byMethodMap.get(item.disposalMethod) ?? 0) + kgCO2e
    );
  }

  // Build breakdowns
  const byWasteType: WasteTypeBreakdown[] = [...byTypeMap.entries()].map(
    ([wasteType, totalKgCO2e]) => ({ wasteType, totalKgCO2e })
  );

  const byDisposalMethod: DisposalMethodBreakdown[] = [
    ...byMethodMap.entries(),
  ].map(([disposalMethod, totalKgCO2e]) => ({ disposalMethod, totalKgCO2e }));

  return {
    totalKgCO2e: Math.round(totalKgCO2e * 1000) / 1000, // round to 3 decimal places
    byWasteType,
    byDisposalMethod,
    source:
      "DESNZ/DEFRA 2024 Greenhouse Gas Conversion Factors for Company Reporting, Section 12",
    factorYear: 2024,
  };
}