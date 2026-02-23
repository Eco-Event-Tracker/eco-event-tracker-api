import { Router } from 'express';
import healthRoutes from './health.routes';
import eventRoutes from './event.routes';

const router = Router();

router.use('/', healthRoutes);
router.use('/', eventRoutes);

export default router;
