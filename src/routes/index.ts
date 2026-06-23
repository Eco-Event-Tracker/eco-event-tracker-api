import { Router } from 'express';
import healthRoutes from './health.routes';
import eventRoutes from './event.routes';
import authRoutes from './auth.routes';
import estimateRoutes from './estimate.routes';

const router = Router();

router.use('/', healthRoutes);
router.use('/', eventRoutes);
router.use('/', authRoutes);
router.use('/', estimateRoutes);

export default router;
