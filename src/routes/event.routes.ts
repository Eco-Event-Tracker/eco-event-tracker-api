import { Router } from 'express';
import { createEvent, exportEventReport, getEventDetails } from '../controllers/event.controller';

const router = Router();

router.post('/events', createEvent);
router.get('/events/:eventId', getEventDetails);
router.get('/events/:eventId/report', exportEventReport);

export default router;
