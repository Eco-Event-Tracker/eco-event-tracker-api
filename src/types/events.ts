import { EstimateInput, EstimateResult } from './estimate';

/** Optional descriptive metadata that does not affect the estimate. */
export interface EventDetails {
  description?: string;
  category?: string;
}

export interface CreateEventRequest {
  title: string;
  location: string;
  event_date: string;
  /** Planning-level inputs fed to the estimation engine. */
  plan: EstimateInput;
  /** Optional descriptive metadata (description, category). */
  details?: EventDetails;
}

export interface EventRow {
  id: string;
  title: string;
  location: string;
  event_date: string;
  participant_count: number;
  is_virtual: boolean;
  plan: EstimateInput | null;
  details: EventDetails | null;
  estimated_co2: number;
  created_by: string;
  created_at: string;
}

export interface CreateEventResult {
  event: EventRow;
}

/** Lightweight event shape returned by the list endpoint for the dashboard. */
export interface EventSummary {
  id: string;
  title: string;
  location: string;
  event_date: string;
  participant_count: number;
  is_virtual: boolean;
  estimated_co2: number;
  category?: string;
  created_at: string;
}

export interface EventDetailsResponse {
  title: string;
  location: string;
  event_date: string;
  plan: EstimateInput;
  details: EventDetails;
  estimate: EstimateResult;
}

// ---------------------------------------------------------------------------
// Retained for the legacy co2-calculation.service (not used by the planning flow)
// ---------------------------------------------------------------------------

export interface EventEmissionDataRow {
  id: string;
  event_id: string;
  energy_kwh: number;
  travel_km: number;
  catering_meals: number;
  waste_kg: number;
  total_co2: number;
  created_at: string;
}

export interface EventEmissionBreakdown {
  energy: number;
  travel: number;
  catering: number;
  waste: number;
}
