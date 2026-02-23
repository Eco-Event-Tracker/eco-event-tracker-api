import { eventRepository } from '../repositories/event.repository';
import {
  CreateEventRequest,
  CreateEventResult,
  EventDetailsResponse
} from '../types/events';
import { co2CalculationService } from './co2-calculation.service';

const isValidDate = (value: string) => !Number.isNaN(Date.parse(value));

const asNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value));

export class EventService {
  private validateCreateEventPayload(input: CreateEventRequest) {
    if (!input.title?.trim()) {
      throw Object.assign(new Error('title is required'), { statusCode: 400 });
    }
    if (!input.location?.trim()) {
      throw Object.assign(new Error('location is required'), { statusCode: 400 });
    }
    if (!input.event_date || !isValidDate(input.event_date)) {
      throw Object.assign(new Error('event_date must be a valid date'), { statusCode: 400 });
    }

    const attendanceCount = asNumber(input.attendance_count);
    const energyKwh = asNumber(input.energy_kwh);
    const travelKm = asNumber(input.travel_km);
    const cateringMeals = asNumber(input.catering_meals);
    const wasteKg = asNumber(input.waste_kg);

    if (!Number.isInteger(attendanceCount) || attendanceCount < 0) {
      throw Object.assign(new Error('attendance_count must be a non-negative integer'), { statusCode: 400 });
    }
    if (!Number.isFinite(energyKwh) || energyKwh < 0) {
      throw Object.assign(new Error('energy_kwh must be a non-negative number'), { statusCode: 400 });
    }
    if (!Number.isFinite(travelKm) || travelKm < 0) {
      throw Object.assign(new Error('travel_km must be a non-negative number'), { statusCode: 400 });
    }
    if (!Number.isInteger(cateringMeals) || cateringMeals < 0) {
      throw Object.assign(new Error('catering_meals must be a non-negative integer'), { statusCode: 400 });
    }
    if (!Number.isFinite(wasteKg) || wasteKg < 0) {
      throw Object.assign(new Error('waste_kg must be a non-negative number'), { statusCode: 400 });
    }
  }

  async createEventWithEmissionData(input: CreateEventRequest, createdBy: string): Promise<CreateEventResult> {
    if (!createdBy?.trim()) {
      throw Object.assign(new Error('x-user-id header is required'), { statusCode: 400 });
    }

    this.validateCreateEventPayload(input);

    return eventRepository.createEventWithEmissionData(
      {
        title: input.title.trim(),
        location: input.location.trim(),
        event_date: input.event_date,
        attendance_count: asNumber(input.attendance_count),
        energy_kwh: asNumber(input.energy_kwh),
        travel_km: asNumber(input.travel_km),
        catering_meals: asNumber(input.catering_meals),
        waste_kg: asNumber(input.waste_kg)
      },
      createdBy
    );
  }

  async getEventDetailsWithCalculatedCo2(eventId: string): Promise<EventDetailsResponse> {
    if (!eventId?.trim()) {
      throw Object.assign(new Error('eventId is required'), { statusCode: 400 });
    }

    const result = await eventRepository.getEventWithEmissionAndFactors(eventId);

    if (!result) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    const emissionResult = await co2CalculationService.calculate(result.emissionData, result.factors);

    return {
      title: result.event.title,
      location: result.event.location,
      event_date: result.event.event_date,
      total_co2: emissionResult.total_co2,
      breakdown: emissionResult.breakdown
    };
  }

  async getEventOrThrow(eventId: string) {
    if (!eventId?.trim()) {
      throw Object.assign(new Error('eventId is required'), { statusCode: 400 });
    }

    const result = await eventRepository.getEventWithEmissionAndFactors(eventId);
    if (!result) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    return result;
  }
}

export const eventService = new EventService();
