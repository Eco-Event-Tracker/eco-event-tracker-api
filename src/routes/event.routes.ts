import { Router } from 'express';
import {
  createEvent,
  deleteEvent,
  exportEventReport,
  getEventDetails,
  listEvents
} from '../controllers/event.controller';

const router = Router();

router.get('/events', listEvents);
router.post('/events', createEvent);
router.get('/events/:eventId', getEventDetails);
router.delete('/events/:eventId', deleteEvent);
router.get('/events/:eventId/report', exportEventReport);

export default router;
