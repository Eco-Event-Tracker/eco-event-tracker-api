import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { healthCheck } from './controllers/health.controller';
import { notFound } from './middlewares/not-found.middleware';
import { errorHandler } from './middlewares/error.middleware';
import TestWasteCalculation from './services/waste/waste.test';
import TestTransportCalculation from './services/transport/transport.test';
import TestPowerCalculation from './services/power/power.test';
import TestVirtualPowerCalculation from './services/virtual-power/virual-power.test';
import TestCateringCalculation from './services/catering/catering.test';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', healthCheck);
app.get('/test-waste', (req, res) => {
  const result: string = TestWasteCalculation();
  res.write(result)
  res.end();
})
app.get('/test-transport', (req, res) => {
  const result: string = TestTransportCalculation();
  res.write(result);
  res.end();
})
app.get('/test-power', (req, res) => {
  const result: string = TestPowerCalculation();
  res.write(result);
  res.end();
})
app.get('/test-virtual-power', (req, res) => {
  const result: string = TestVirtualPowerCalculation();
  res.write(result);
  res.end();
})
app.get('/test-catering', (req, res) => {
  const result: string = TestCateringCalculation();
  res.write(result);
  res.end();
})
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
