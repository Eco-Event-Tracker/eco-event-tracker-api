import { Router } from 'express';
import healthRoutes from './health.routes';
import eventRoutes from './event.routes';
import authRoutes from './auth.routes';

const router = Router();

router.use('/', healthRoutes);
router.use('/', eventRoutes);
router.use('/', authRoutes);

export default router;
