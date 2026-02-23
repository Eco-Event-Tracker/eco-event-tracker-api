import { supabase } from '../config/supabase';
import { CreateEventRequest, CreateEventResult, EventEmissionDataRow, EventRow } from '../types/events';

export class EventRepository {
  async createEventWithEmissionData(input: CreateEventRequest, createdBy: string): Promise<CreateEventResult> {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: input.title,
        location: input.location,
        event_date: input.event_date,
        attendance_count: input.attendance_count,
        created_by: createdBy
      })
      .select('*')
      .single();

    if (eventError || !event) {
      throw new Error(eventError?.message || 'Failed to create event');
    }

    const { data: emissionData, error: emissionError } = await supabase
      .from('event_emission_data')
      .insert({
        event_id: event.id,
        energy_kwh: input.energy_kwh,
        travel_km: input.travel_km,
        catering_meals: input.catering_meals,
        waste_kg: input.waste_kg,
        total_co2: 0
      })
      .select('*')
      .single();

    if (emissionError || !emissionData) {
      await supabase.from('events').delete().eq('id', event.id);
      throw new Error(emissionError?.message || 'Failed to create emission data');
    }

    return { event: event as EventRow, emissionData: emissionData as EventEmissionDataRow };
  }
}

export const eventRepository = new EventRepository();
