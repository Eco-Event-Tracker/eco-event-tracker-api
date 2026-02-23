import { Router } from 'express';
import { createEvent } from '../controllers/event.controller';

const router = Router();

router.post('/events', createEvent);

export default router;
