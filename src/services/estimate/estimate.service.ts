/**
 * Event Emission Estimation Engine (planning-time)
 *
 * The accuracy core of EcoEvent. It takes the handful of things an organizer
 * actually knows before an event (format, headcount, duration, power source,
 * audience reach, catering style, waste route) and routes them into the
 * existing, source-verified calculators:
 *
 *   power.service        — venue electricity (grid / generator / solar / mixed)
 *   transport.service    — attendee travel (by audience reach)
 *   catering.service     — meals (by menu leaning)
 *   waste.service        — waste (quantity estimated from headcount)
 *   virtual-power.service — streaming footprint for online participants
 *
 * No new emission factors are introduced here. Accuracy comes from feeding the
 * verified factors with realistic, planning-level inputs — and from running the
 * same engine on "what-if" variants to surface the highest-impact reductions.
 *
 * The function is pure and stateless: same input → same output, no DB, no I/O.
 * Calling it repeatedly with tweaked inputs is exactly what powers the
 * interactive what-if screen.
 */

import { calculatePowerEmissions, PowerEntry, PowerSource } from "../power/power.service";
import { estimateTransportEmissions, EventPreset } from "../transport/transport.service";
import { calculateCateringEmissions, CateringItem, MealType } from "../catering/catering.service";
import { calculateWasteEmissions } from "../waste/waste.service";
import { calculateVirtualPowerEmissions, VideoQuality } from "../virtual-power/virtual-power.service";
import {
  EstimateInput,
  EstimateResult,
  EstimateBreakdown,
  EstimateAction,
  CateringOption,
  PowerSourceOption,
} from "../../types/estimate";

// ---------------------------------------------------------------------------
// Tunable planning assumptions (safe to adjust — these are NOT emission factors)
// ---------------------------------------------------------------------------

/** Typical event waste generated per in-room attendee, in kg. */
const WASTE_KG_PER_ATTENDEE = 0.5;

/** For the "make it hybrid" what-if: share of attendees moved online. */
const HYBRID_SHADOW_SHARE = 0.5;

/**
 * Menu leaning → diet mix. Shares sum to 1.0. These map a single planning
 * choice onto the per-diet meal factors already verified in catering.service.
 */
const DIET_PROFILES: Record<Exclude<CateringOption, "none">, Array<{ type: MealType; share: number }>> = {
  plant_forward: [
    { type: "vegan", share: 0.40 },
    { type: "vegetarian", share: 0.35 },
    { type: "low_meat", share: 0.15 },
    { type: "medium_meat", share: 0.10 },
  ],
  mixed: [
    { type: "vegan", share: 0.10 },
    { type: "vegetarian", share: 0.20 },
    { type: "low_meat", share: 0.25 },
    { type: "medium_meat", share: 0.25 },
    { type: "high_meat", share: 0.20 },
  ],
  meat_heavy: [
    { type: "vegetarian", share: 0.05 },
    { type: "low_meat", share: 0.10 },
    { type: "medium_meat", share: 0.30 },
    { type: "high_meat", share: 0.55 },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

function err(message: string) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function resolveCounts(input: EstimateInput): { inRoom: number; online: number } {
  const attendance = input.attendance ?? 0;
  const online = input.online_attendance ?? 0;
  if (input.format === "in_person") return { inRoom: attendance, online: 0 };
  if (input.format === "hybrid") return { inRoom: attendance, online };
  // virtual — everyone is online; allow either field to carry the count
  return { inRoom: 0, online: online > 0 ? online : attendance };
}

function powerSourceLabel(s: PowerSourceOption): string {
  const labels: Record<PowerSourceOption, string> = {
    grid: "grid electricity",
    generator: "diesel generator",
    solar: "solar",
    mixed: "grid + generator mix",
  };
  return labels[s];
}

function cateringLabel(c: CateringOption): string {
  const labels: Record<CateringOption, string> = {
    none: "no",
    plant_forward: "plant-forward",
    mixed: "mixed",
    meat_heavy: "meat-heavy",
  };
  return labels[c];
}

function buildPowerEntries(source: PowerSourceOption, durationHours: number, inRoom: number): PowerEntry[] {
  if (source === "mixed") {
    // Generator covers half the runtime (typical grid-outage backup pattern).
    return [
      { source: "grid_electricity", durationHours: durationHours / 2, participantCount: inRoom },
      { source: "diesel_generator", durationHours: durationHours / 2, participantCount: inRoom },
    ];
  }
  const map: Record<Exclude<PowerSourceOption, "mixed">, PowerSource> = {
    grid: "grid_electricity",
    generator: "diesel_generator",
    solar: "solar",
  };
  return [{ source: map[source], durationHours, participantCount: inRoom }];
}

function buildCateringItems(option: CateringOption, servings: number): CateringItem[] {
  if (option === "none" || servings <= 0) return [];
  return DIET_PROFILES[option]
    .map((p) => ({ category: "meal" as const, type: p.type, servings: Math.round(servings * p.share) }))
    .filter((i) => i.servings > 0);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateInput(input: EstimateInput): void {
  if (!input || typeof input !== "object") throw err("request body is required");
  if (!["in_person", "hybrid", "virtual"].includes(input.format)) {
    throw err('format must be one of "in_person", "hybrid", "virtual"');
  }
  if (!Number.isFinite(input.duration_hours) || input.duration_hours <= 0) {
    throw err("duration_hours must be a positive number");
  }
  if (!Number.isInteger(input.attendance) || input.attendance < 0) {
    throw err("attendance must be a non-negative integer");
  }
  if (
    input.online_attendance !== undefined &&
    (!Number.isInteger(input.online_attendance) || input.online_attendance < 0)
  ) {
    throw err("online_attendance must be a non-negative integer");
  }
  const { inRoom, online } = resolveCounts(input);
  if (inRoom + online <= 0) {
    throw err("event must have at least one attendee (attendance or online_attendance)");
  }
  if (input.power_source && !["grid", "generator", "solar", "mixed"].includes(input.power_source)) {
    throw err("invalid power_source");
  }
  if (
    input.audience_reach &&
    !["local", "regional", "national", "international"].includes(input.audience_reach)
  ) {
    throw err("invalid audience_reach");
  }
  if (input.catering && !["none", "plant_forward", "mixed", "meat_heavy"].includes(input.catering)) {
    throw err("invalid catering");
  }
  if (input.waste_disposal && !["landfill", "recycling", "composting"].includes(input.waste_disposal)) {
    throw err("invalid waste_disposal");
  }
  if (input.stream_quality && !["sd", "hd"].includes(input.stream_quality)) {
    throw err("invalid stream_quality");
  }
}

// ---------------------------------------------------------------------------
// Core computation (breakdown + assumptions)
// ---------------------------------------------------------------------------

interface BaseComputation {
  breakdown: EstimateBreakdown;
  total: number;
  assumptions: string[];
  inRoom: number;
  online: number;
}

function computeBase(input: EstimateInput): BaseComputation {
  const { inRoom, online } = resolveCounts(input);
  const duration = input.duration_hours;
  const powerSource = input.power_source ?? "grid";
  const reach = input.audience_reach ?? "local";
  const catering = input.catering ?? (inRoom > 0 ? "mixed" : "none");
  const disposal = input.waste_disposal ?? "landfill";
  const quality: VideoQuality = input.stream_quality === "sd" ? "sd" : "hd";

  const assumptions: string[] = [];
  let energy = 0;
  let travel = 0;
  let cateringCo2 = 0;
  let waste = 0;
  let streaming = 0;

  const physical = inRoom > 0 && input.format !== "virtual";

  // --- Venue power ---
  if (physical) {
    const power = calculatePowerEmissions(buildPowerEntries(powerSource, duration, inRoom));
    energy = power.totalKgCO2e;
    assumptions.push(
      `Venue power: ${inRoom} attendees × ${duration} h on ${powerSourceLabel(powerSource)} ` +
        `(~${power.totalKwh} kWh, load estimated from headcount). Source: ${power.source}`
    );
  }

  // --- Travel ---
  if (physical) {
    const t = estimateTransportEmissions(inRoom, { preset: reach as EventPreset });
    travel = t.totalKgCO2e;
    assumptions.push(
      `Travel: ${inRoom} attendees, "${reach}" reach distance model. Source: ${t.source}`
    );
  }

  // --- Catering ---
  if (inRoom > 0 && catering !== "none") {
    const items = buildCateringItems(catering, inRoom);
    if (items.length > 0) {
      const c = calculateCateringEmissions(items);
      cateringCo2 = c.totalKgCO2e;
      assumptions.push(
        `Catering: ${inRoom} servings, ${cateringLabel(catering)} menu. Source: ${c.source}`
      );
    }
  } else if (inRoom > 0) {
    assumptions.push("Catering: none provided.");
  }

  // --- Waste (quantity estimated from headcount) ---
  if (inRoom > 0) {
    const wasteKg = inRoom * WASTE_KG_PER_ATTENDEE;
    const w = calculateWasteEmissions([
      { wasteType: "mixed", disposalMethod: disposal, quantityG: wasteKg * 1000 },
    ]);
    waste = w.totalKgCO2e;
    assumptions.push(
      `Waste: ~${round(wasteKg, 0)} kg estimated (${WASTE_KG_PER_ATTENDEE} kg/attendee), ${disposal}. ` +
        `Source: ${w.source}`
    );
  }

  // --- Streaming (online participants) ---
  if (online > 0) {
    const v = calculateVirtualPowerEmissions({
      participantCount: online,
      durationHours: duration,
      quality,
    });
    streaming = v.totalKgCO2e;
    assumptions.push(
      `Streaming: ${online} online participants × ${duration} h, ${quality.toUpperCase()} quality. ` +
        `Source: ${v.source}`
    );
  }

  const breakdown: EstimateBreakdown = {
    energy: round(energy),
    travel: round(travel),
    catering: round(cateringCo2),
    waste: round(waste),
    streaming: round(streaming),
  };
  const total = round(energy + travel + cateringCo2 + waste + streaming);

  return { breakdown, total, assumptions, inRoom, online };
}

// ---------------------------------------------------------------------------
// What-if levers → top reduction actions
// ---------------------------------------------------------------------------

function buildTopActions(input: EstimateInput, baseTotal: number): EstimateAction[] {
  const candidates: Array<{ action: string; variant: EstimateInput }> = [];

  // Power
  if (input.format !== "virtual") {
    const src = input.power_source ?? "grid";
    if (src === "generator" || src === "mixed") {
      candidates.push({
        action: "Switch from generator to grid power",
        variant: { ...input, power_source: "grid" },
      });
    } else if (src === "grid") {
      candidates.push({
        action: "Power the venue with solar",
        variant: { ...input, power_source: "solar" },
      });
    }
  }

  // Catering
  const cat = input.catering ?? "mixed";
  if (input.format !== "virtual" && (cat === "mixed" || cat === "meat_heavy")) {
    candidates.push({
      action: "Switch to a plant-forward menu",
      variant: { ...input, catering: "plant_forward" },
    });
  }

  // Format — make it hybrid (move some attendees online)
  if (input.format === "in_person" && input.attendance > 1) {
    const moved = Math.round(input.attendance * HYBRID_SHADOW_SHARE);
    candidates.push({
      action: `Make it hybrid (move ~${Math.round(HYBRID_SHADOW_SHARE * 100)}% of attendees online)`,
      variant: {
        ...input,
        format: "hybrid",
        attendance: input.attendance - moved,
        online_attendance: (input.online_attendance ?? 0) + moved,
      },
    });
  }

  // Waste
  if (input.format !== "virtual" && (input.waste_disposal ?? "landfill") === "landfill") {
    candidates.push({
      action: "Recycle or compost waste instead of landfill",
      variant: { ...input, waste_disposal: "recycling" },
    });
  }

  // Travel reach
  if (
    input.format !== "virtual" &&
    (input.audience_reach === "national" || input.audience_reach === "international")
  ) {
    candidates.push({
      action: "Prioritise local attendance / virtual options for distant guests",
      variant: { ...input, audience_reach: "regional" },
    });
  }

  return candidates
    .map(({ action, variant }) => {
      const altTotal = computeBase(variant).total;
      const savingKg = round(baseTotal - altTotal);
      const savingPct = baseTotal > 0 ? round((savingKg / baseTotal) * 100, 1) : 0;
      return { action, savingKg, savingPct };
    })
    .filter((a) => a.savingKg > 0)
    .sort((a, b) => b.savingKg - a.savingKg)
    .slice(0, 3);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Estimates an event's carbon footprint from planning-level inputs and returns
 * a decision-ready result: total, category breakdown, per-attendee intensity,
 * the biggest contributor, transparent assumptions, and the top reduction
 * levers (with kg/percent saved).
 */
export function estimateEventEmissions(input: EstimateInput): EstimateResult {
  validateInput(input);

  const base = computeBase(input);
  const totalPeople = base.inRoom + base.online;
  const perAttendee = totalPeople > 0 ? round(base.total / totalPeople, 3) : 0;

  const entries = Object.entries(base.breakdown) as Array<[keyof EstimateBreakdown, number]>;
  const [topCategory, topKg] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const biggestContributor = {
    category: topCategory,
    kg: round(topKg),
    pct: base.total > 0 ? round((topKg / base.total) * 100, 1) : 0,
  };

  return {
    total: base.total,
    breakdown: base.breakdown,
    perAttendee,
    biggestContributor,
    assumptions: base.assumptions,
    topActions: buildTopActions(input, base.total),
  };
}
