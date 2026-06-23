import { Router } from 'express';
import { createEstimate } from '../controllers/estimate.controller';

const router = Router();

router.post('/estimate', createEstimate);

export default router;
