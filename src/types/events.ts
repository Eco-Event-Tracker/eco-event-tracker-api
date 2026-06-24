import { EstimateInput, EstimateResult } from './estimate';

export interface CreateEventRequest {
  title: string;
  location: string;
  event_date: string;
  /** Planning-level inputs fed to the estimation engine. */
  plan: EstimateInput;
}

export interface EventRow {
  id: string;
  title: string;
  location: string;
  event_date: string;
  participant_count: number;
  is_virtual: boolean;
  plan: EstimateInput | null;
  estimated_co2: number;
  created_by: string;
  created_at: string;
}

export interface CreateEventResult {
  event: EventRow;
}

export interface EventDetailsResponse {
  title: string;
  location: string;
  event_date: string;
  plan: EstimateInput;
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
