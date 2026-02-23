import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { reportExportService } from '../services/report-export.service';
import { CreateEventRequest } from '../types/events';

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const createdBy = req.header('x-user-id') || '';
    const payload = req.body as CreateEventRequest;

    const result = await eventService.createEventWithEmissionData(payload, createdBy);

    res.status(201).json({
      id: result.event.id,
      title: result.event.title,
      location: result.event.location,
      event_date: result.event.event_date,
      attendance_count: result.event.attendance_count,
      emission_data: {
        energy_kwh: result.emissionData.energy_kwh,
        travel_km: result.emissionData.travel_km,
        catering_meals: result.emissionData.catering_meals,
        waste_kg: result.emissionData.waste_kg,
        total_co2: result.emissionData.total_co2
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getEventDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const result = await eventService.getEventDetailsWithCalculatedCo2(eventId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const exportEventReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const queryFormat = String(req.query.format || 'csv').toLowerCase();
    const format = queryFormat === 'pdf' ? 'pdf' : 'csv';

    const report = await reportExportService.exportByEventId(eventId, format);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename=\"${report.filename}\"`);
    res.status(200).send(report.body);
  } catch (error) {
    next(error);
  }
};
