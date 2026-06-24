import { supabase } from '../config/supabase';
import { CreateEventResult, EventRow } from '../types/events';
import { EstimateInput } from '../types/estimate';

interface CreateEventInsert {
  title: string;
  location: string;
  event_date: string;
  participant_count: number;
  is_virtual: boolean;
  plan: EstimateInput;
  estimated_co2: number;
}

export class EventRepository {
  async createEvent(input: CreateEventInsert, createdBy: string): Promise<CreateEventResult> {
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title: input.title,
        location: input.location,
        event_date: input.event_date,
        participant_count: input.participant_count,
        is_virtual: input.is_virtual,
        plan: input.plan,
        estimated_co2: input.estimated_co2,
        created_by: createdBy
      })
      .select('*')
      .single();

    if (error || !event) {
      throw new Error(error?.message || 'Failed to create event');
    }

    return { event: event as EventRow };
  }

  async getEventById(eventId: string): Promise<EventRow | null> {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(error.message || 'Failed to fetch event');
    }

    return event as EventRow;
  }
}

export const eventRepository = new EventRepository();
