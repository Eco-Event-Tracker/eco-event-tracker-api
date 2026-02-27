/**
 * Power Emission Calculator (Onsite Events)
 *
 * Calculates CO2e emissions from event power consumption across multiple
 * power sources. Designed for the Nigerian context where diesel generators
 * are common alongside grid electricity.
 *
 * Emission factor sources:
 * - Grid electricity (Nigeria): IEA Emissions Factors 2023, Nigeria grid mix
 *   (approx. 87% natural gas, 13% hydro → 0.431 kg CO2e/kWh)
 * - Diesel generator: IPCC 2006 Guidelines Vol.2 + Nigerian context adjustment
 *   for small generator inefficiency penalty (~0.700 kg CO2e/kWh)
 * - Natural gas (direct combustion): IPCC 2006 / DEFRA 2024 fuel factors
 *   (0.202 kg CO2e/kWh thermal output)
 * - Solar PV: 0.0 kg CO2e/kWh (operational only; embodied carbon excluded)
 *
 * Framework: GHG Protocol Scope 2 (grid electricity) and Scope 1
 * (on-site combustion — diesel, natural gas).
 *
 * Note on diesel generators in Nigeria:
 * Small generators (1–10 kW) are significantly less efficient than utility-scale
 * plants and emit roughly 2× more CO2 per kWh than a gas-fired power station.
 * The 0.700 kg CO2e/kWh factor reflects this real-world penalty.
 *
 * --- Participant-based load estimation ---
 *
 * When loadKw is unknown, it can be estimated from participantCount using
 * benchmarks derived from event energy audits and venue engineering guidelines
 * (CIBSE Guide F / ASHRAE 90.1 / Carbon Trust event sector benchmarks):
 *
 *   Event scale       Participants   W per person   Basis
 *   ─────────────────────────────────────────────────────────────────────
 *   intimate          1–49           60 W/pp        Small meeting rooms; minimal AV,
 *                                                   shared HVAC, basic lighting
 *   small             50–199         50 W/pp        Conference rooms; modest AV rig,
 *                                                   dedicated HVAC zone
 *   medium            200–999        40 W/pp        Event halls; full AV/PA, catering
 *                                                   equipment, HVAC — economies of scale
 *   large             1000–4999      30 W/pp        Convention centres; efficient shared
 *                                                   infrastructure per head
 *   mega              5000+          25 W/pp        Stadia/arenas; very high infrastructure
 *                                                   efficiency per head
 *
 * These are conservative midpoints. Outdoor events, high-production concerts,
 * or venues with poor insulation will sit at the higher end. The estimated
 * loadKw is surfaced in the result notes for transparency.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PowerSource =
  | "grid_electricity"
  | "diesel_generator"
  | "solar"
  | "natural_gas";

/**
 * A single power source entry for the event.
 *
 * Provide ONE of the following to determine energy consumed:
 *   (a) totalKwh                          — exact consumption known
 *   (b) durationHours + loadKw            — duration and load known
 *   (c) durationHours + participantCount  — load estimated from headcount
 *
 * Priority: totalKwh > (durationHours + loadKw) > (durationHours + participantCount)
 */
export interface PowerEntry {
  source: PowerSource;
  /**
   * Duration the source was active, in hours.
   * Required for options (b) and (c).
   */
  durationHours?: number;
  /**
   * Average power load in kilowatts (kW).
   * Use when the load is known. Takes precedence over participantCount.
   */
  loadKw?: number;
  /**
   * Number of attendees at the event.
   * Used to estimate loadKw when the actual load is unknown.
   * A per-person wattage benchmark is applied based on event scale.
   * Ignored if loadKw is provided.
   */
  participantCount?: number;
  /**
   * Total energy consumed in kilowatt-hours (kWh).
   * Use this if you already know the total consumption.
   * Takes precedence over all other fields.
   */
  totalKwh?: number;
}

export interface PowerSourceBreakdown {
  source: PowerSource;
  totalKwh: number;
  totalKgCO2e: number;
  emissionFactor: number;
  scope: "scope_1" | "scope_2" | "zero";
  /** Populated only when loadKw was estimated from participantCount. */
  estimatedLoadKw?: number;
}

export interface PowerEmissionResult {
  totalKgCO2e: number;
  totalKwh: number;
  bySource: PowerSourceBreakdown[];
  source: string;
  factorYear: number;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Emission factors (kg CO2e per kWh)
// ---------------------------------------------------------------------------

interface FactorMeta {
  /** kg CO2e per kWh */
  kgCO2ePerKwh: number;
  /** GHG Protocol scope classification */
  scope: "scope_1" | "scope_2" | "zero";
  /** Reference for this factor */
  reference: string;
}

const EMISSION_FACTORS: Record<PowerSource, FactorMeta> = {
  grid_electricity: {
    kgCO2ePerKwh: 0.431,
    scope: "scope_2",
    reference: "IEA Emissions Factors 2023 — Nigeria grid mix (CO2 per kWh, electricity generation)",
  },
  diesel_generator: {
    kgCO2ePerKwh: 0.700,
    scope: "scope_1",
    reference:
      "IPCC 2006 Guidelines Vol.2 (diesel combustion) + small generator inefficiency adjustment. " +
      "Reflects typical 1–50 kW generator performance in Nigerian context (~2× utility-scale efficiency).",
  },
  solar: {
    kgCO2ePerKwh: 0.0,
    scope: "zero",
    reference:
      "Operational emissions only. Solar PV has zero direct combustion emissions. " +
      "Embodied carbon from panel manufacture (~40–50 g CO2e/kWh lifecycle) is excluded " +
      "as it is attributed to the manufacturer, not the event operator.",
  },
  natural_gas: {
    kgCO2ePerKwh: 0.202,
    scope: "scope_1",
    reference:
      "IPCC 2006 Guidelines Vol.2 / DEFRA 2024 fuel combustion factors for natural gas " +
      "(direct combustion, thermal output basis: 0.202 kg CO2e/kWh).",
  },
};

// ---------------------------------------------------------------------------
// Participant-based load estimation
// ---------------------------------------------------------------------------

/**
 * Watts per person benchmarks by event scale.
 * Covers total venue load: lighting, AV/PA, HVAC, catering equipment, misc.
 * Sources: CIBSE Guide F, ASHRAE 90.1, Carbon Trust event sector benchmarks.
 */
const WATTS_PER_PERSON: Array<{ maxParticipants: number; wattsPerPerson: number; label: string }> = [
  { maxParticipants: 49,   wattsPerPerson: 60, label: "intimate (<50)" },
  { maxParticipants: 199,  wattsPerPerson: 50, label: "small (50–199)" },
  { maxParticipants: 999,  wattsPerPerson: 40, label: "medium (200–999)" },
  { maxParticipants: 4999, wattsPerPerson: 30, label: "large (1000–4999)" },
  { maxParticipants: Infinity, wattsPerPerson: 25, label: "mega (5000+)" },
];

/**
 * Returns estimated load in kW and the scale label used.
 */
function estimateLoadKw(participantCount: number): { loadKw: number; scaleLabel: string } {
  const bracket = WATTS_PER_PERSON.find((b) => participantCount <= b.maxParticipants)!;
  return {
    loadKw: (participantCount * bracket.wattsPerPerson) / 1000,
    scaleLabel: bracket.label,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_SOURCES = new Set<PowerSource>([
  "grid_electricity",
  "diesel_generator",
  "solar",
  "natural_gas",
]);

interface ResolvedKwh {
  kwh: number;
  estimatedLoadKw?: number;  // set only when participant estimation was used
  scaleLabel?: string;
}

function resolveKwh(entry: PowerEntry, index: number): ResolvedKwh {
  // (a) totalKwh — highest priority
  if (entry.totalKwh !== undefined) {
    if (entry.totalKwh < 0) {
      throw new Error(`Entry ${index}: totalKwh must be >= 0, got ${entry.totalKwh}`);
    }
    return { kwh: entry.totalKwh };
  }

  // durationHours is required for both remaining paths
  if (entry.durationHours === undefined) {
    throw new Error(
      `Entry ${index}: provide totalKwh, or durationHours with either loadKw or participantCount`
    );
  }
  if (entry.durationHours < 0) {
    throw new Error(`Entry ${index}: durationHours must be >= 0`);
  }

  // (b) explicit loadKw
  if (entry.loadKw !== undefined) {
    if (entry.loadKw < 0) {
      throw new Error(`Entry ${index}: loadKw must be >= 0`);
    }
    return { kwh: entry.durationHours * entry.loadKw };
  }

  // (c) estimate from participantCount
  if (entry.participantCount !== undefined) {
    if (entry.participantCount <= 0) {
      throw new Error(`Entry ${index}: participantCount must be > 0`);
    }
    const { loadKw, scaleLabel } = estimateLoadKw(entry.participantCount);
    return {
      kwh: entry.durationHours * loadKw,
      estimatedLoadKw: loadKw,
      scaleLabel,
    };
  }

  throw new Error(
    `Entry ${index}: provide totalKwh, or durationHours with either loadKw or participantCount`
  );
}

function validateEntry(entry: PowerEntry, index: number): void {
  if (!VALID_SOURCES.has(entry.source)) {
    throw new Error(
      `Entry ${index}: unknown power source "${entry.source}". ` +
        `Valid sources: ${[...VALID_SOURCES].join(", ")}`
    );
  }
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

/**
 * Calculates CO2e emissions from event power consumption.
 *
 * Multiple entries of the same source are allowed and will be aggregated
 * (e.g., two diesel generators running different loads at different times).
 *
 * Load can be specified three ways per entry:
 *   - `totalKwh`                         — exact consumption from meter/invoice
 *   - `durationHours` + `loadKw`         — duration and equipment load known
 *   - `durationHours` + `participantCount` — load estimated from headcount
 *
 * @param entries - Array of power source entries
 * @returns PowerEmissionResult with total and per-source breakdown
 *
 * @example
 * // Known load
 * calculatePowerEmissions([
 *   { source: "grid_electricity", durationHours: 4, loadKw: 50 },
 *   { source: "diesel_generator", durationHours: 8, loadKw: 30 },
 * ]);
 *
 * @example
 * // Estimated from participant count (300-person event, 6 hours)
 * calculatePowerEmissions([
 *   { source: "diesel_generator", durationHours: 6, participantCount: 300 },
 * ]);
 *
 * @example
 * // Known total kWh from venue invoice
 * calculatePowerEmissions([
 *   { source: "grid_electricity", totalKwh: 150 },
 * ]);
 */
export function calculatePowerEmissions(
  entries: PowerEntry[]
): PowerEmissionResult {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("entries must be a non-empty array");
  }

  entries.forEach((entry, i) => validateEntry(entry, i));

  // Aggregate kWh and emissions per source; track estimated loads for notes
  const sourceMap = new Map<
    PowerSource,
    { totalKwh: number; totalKgCO2e: number; estimatedLoadKw?: number; scaleLabel?: string }
  >();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const resolved = resolveKwh(entry, i);
    const meta = EMISSION_FACTORS[entry.source];
    const kgCO2e = resolved.kwh * meta.kgCO2ePerKwh;

    const existing = sourceMap.get(entry.source) ?? { totalKwh: 0, totalKgCO2e: 0 };
    sourceMap.set(entry.source, {
      totalKwh: existing.totalKwh + resolved.kwh,
      totalKgCO2e: existing.totalKgCO2e + kgCO2e,
      // Keep the last estimated load seen for this source (for notes)
      estimatedLoadKw: resolved.estimatedLoadKw ?? existing.estimatedLoadKw,
      scaleLabel: resolved.scaleLabel ?? existing.scaleLabel,
    });
  }

  // Build breakdown
  const bySource: PowerSourceBreakdown[] = [...sourceMap.entries()].map(
    ([source, { totalKwh, totalKgCO2e, estimatedLoadKw }]) => ({
      source,
      totalKwh: Math.round(totalKwh * 1000) / 1000,
      totalKgCO2e: Math.round(totalKgCO2e * 1000) / 1000,
      emissionFactor: EMISSION_FACTORS[source].kgCO2ePerKwh,
      scope: EMISSION_FACTORS[source].scope,
      ...(estimatedLoadKw !== undefined && { estimatedLoadKw }),
    })
  );

  const totalKgCO2e = bySource.reduce((sum, s) => sum + s.totalKgCO2e, 0);
  const totalKwh = bySource.reduce((sum, s) => sum + s.totalKwh, 0);

  // Build contextual notes
  const notes: string[] = [];

  // Surface any participant-estimated loads prominently
  for (const [source, data] of sourceMap.entries()) {
    if (data.estimatedLoadKw !== undefined && data.scaleLabel !== undefined) {
      notes.push(
        `${source}: load estimated at ${data.estimatedLoadKw.toFixed(1)} kW ` +
          `(${data.scaleLabel} event benchmark of ${
            WATTS_PER_PERSON.find((b) => b.label === data.scaleLabel)!.wattsPerPerson
          } W/person). ` +
          "For higher accuracy, replace participantCount with a measured loadKw."
      );
    }
  }

  const hasDiesel = sourceMap.has("diesel_generator");
  const hasGrid = sourceMap.has("grid_electricity");
  const hasSolar = sourceMap.has("solar");

  if (hasDiesel && hasGrid) {
    const dieselKgCO2e = sourceMap.get("diesel_generator")!.totalKgCO2e;
    const gridKgCO2e = sourceMap.get("grid_electricity")!.totalKgCO2e;
    if (dieselKgCO2e > gridKgCO2e) {
      notes.push(
        "Diesel generator is the dominant emission source. " +
          "Replacing generator hours with grid electricity would reduce emissions " +
          "by approximately 39% per kWh (0.700 → 0.431 kg CO2e/kWh)."
      );
    }
  }

  if (hasDiesel && !hasGrid) {
    notes.push(
      "Event is entirely generator-powered. This is the highest-emission scenario. " +
        "Even partial grid or solar substitution would significantly reduce footprint."
    );
  }

  if (hasSolar) {
    const solarKwh = sourceMap.get("solar")!.totalKwh;
    const avoidedEmissions = solarKwh * EMISSION_FACTORS["diesel_generator"].kgCO2ePerKwh;
    notes.push(
      `Solar contributed ${solarKwh.toFixed(1)} kWh at zero operational emissions, ` +
        `avoiding approximately ${avoidedEmissions.toFixed(2)} kg CO2e vs diesel equivalent.`
    );
  }

  notes.push(
    "Nigeria grid factor (0.431 kg CO2e/kWh) sourced from IEA Emissions Factors 2023. " +
      "Diesel generator factor (0.700 kg CO2e/kWh) includes small-generator inefficiency penalty " +
      "typical of 1–50 kW units common in Nigeria."
  );

  return {
    totalKgCO2e: Math.round(totalKgCO2e * 1000) / 1000,
    totalKwh: Math.round(totalKwh * 1000) / 1000,
    bySource,
    source:
      "IEA Emissions Factors 2023 (Nigeria grid); IPCC 2006 Vol.2 (diesel, natural gas); " +
      "GHG Protocol Scope 1 & 2 methodology; " +
      "CIBSE Guide F / Carbon Trust event benchmarks (participant load estimation)",
    factorYear: 2023,
    notes,
  };
}