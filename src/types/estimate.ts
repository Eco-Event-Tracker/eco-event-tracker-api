/**
 * Planning-time estimation types.
 *
 * These are the questions an event organizer can actually answer BEFORE the
 * event — no kWh, no km, no kg. The estimation engine routes them into the
 * existing, verified emission services (power, transport, catering, waste,
 * virtual) and returns a decision-ready footprint.
 */

export type EventFormat = "in_person" | "hybrid" | "virtual";
export type PowerSourceOption = "grid" | "generator" | "solar" | "mixed";
export type AudienceReach = "local" | "regional" | "national" | "international";
export type CateringOption = "none" | "plant_forward" | "mixed" | "meat_heavy";
export type WasteDisposalOption = "landfill" | "recycling" | "composting";
export type StreamQuality = "sd" | "hd";

export interface EstimateInput {
  /** How the event is held. Determines which modules run. */
  format: EventFormat;
  /** In-room attendance (people physically present). */
  attendance: number;
  /** Online participants (used for hybrid/virtual). */
  online_attendance?: number;
  /** Event duration in hours. */
  duration_hours: number;
  /** Venue power source (physical formats). Defaults to grid. */
  power_source?: PowerSourceOption;
  /** Where in-room attendees travel from (physical formats). Defaults to local. */
  audience_reach?: AudienceReach;
  /** Catering style (physical formats). Defaults to mixed when in-room > 0. */
  catering?: CateringOption;
  /** Waste disposal route (physical formats). Defaults to landfill. */
  waste_disposal?: WasteDisposalOption;
  /** Streaming quality for online participants. Defaults to HD. */
  stream_quality?: StreamQuality;
}

export interface EstimateBreakdown {
  energy: number;
  travel: number;
  catering: number;
  waste: number;
  streaming: number;
}

export interface EstimateAction {
  /** Plain-language reduction lever. */
  action: string;
  /** kg CO2e saved if this single change is made. */
  savingKg: number;
  /** Percentage of the total footprint this change saves. */
  savingPct: number;
}

export interface EstimateResult {
  /** Total estimated emissions in kg CO2e. */
  total: number;
  breakdown: EstimateBreakdown;
  /** kg CO2e per head (in-room + online). */
  perAttendee: number;
  /** The single largest emission category — the place to act first. */
  biggestContributor: { category: keyof EstimateBreakdown; kg: number; pct: number };
  /** Human-readable record of the factors and methods applied. */
  assumptions: string[];
  /** Top reduction levers, ranked by kg CO2e saved (powers the what-if). */
  topActions: EstimateAction[];
}
