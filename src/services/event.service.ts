import { eventRepository } from '../repositories/event.repository';
import { CreateEventRequest, CreateEventResult, EventDetailsResponse } from '../types/events';
import { EstimateInput } from '../types/estimate';
import { estimateEventEmissions } from './estimate/estimate.service';

const isValidDate = (value: string) => !Number.isNaN(Date.parse(value));

export class EventService {
  async createEvent(input: CreateEventRequest, createdBy: string): Promise<CreateEventResult> {
    if (!createdBy?.trim()) {
      throw Object.assign(new Error('x-user-id header is required'), { statusCode: 400 });
    }
    if (!input.title?.trim()) {
      throw Object.assign(new Error('title is required'), { statusCode: 400 });
    }
    if (!input.location?.trim()) {
      throw Object.assign(new Error('location is required'), { statusCode: 400 });
    }
    if (!input.event_date || !isValidDate(input.event_date)) {
      throw Object.assign(new Error('event_date must be a valid date'), { statusCode: 400 });
    }
    if (!input.plan || typeof input.plan !== 'object') {
      throw Object.assign(new Error('plan is required'), { statusCode: 400 });
    }

    // estimateEventEmissions validates the plan and throws a 400 on bad inputs.
    const estimate = estimateEventEmissions(input.plan);
    const plan = input.plan;

    return eventRepository.createEvent(
      {
        title: input.title.trim(),
        location: input.location.trim(),
        event_date: input.event_date,
        participant_count: plan.attendance ?? 0,
        is_virtual: plan.format === 'virtual',
        plan,
        estimated_co2: estimate.total
      },
      createdBy
    );
  }

  async getEventDetails(eventId: string): Promise<EventDetailsResponse> {
    if (!eventId?.trim()) {
      throw Object.assign(new Error('eventId is required'), { statusCode: 400 });
    }

    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }
    if (!event.plan) {
      throw Object.assign(new Error('Event has no plan data'), { statusCode: 422 });
    }

    const plan = event.plan as EstimateInput;
    const estimate = estimateEventEmissions(plan);

    return {
      title: event.title,
      location: event.location,
      event_date: event.event_date,
      plan,
      estimate
    };
  }
}

export const eventService = new EventService();
