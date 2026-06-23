import { Request, Response, NextFunction } from 'express';
import { estimateEventEmissions } from '../services/estimate/estimate.service';
import { EstimateInput } from '../types/estimate';

export const createEstimate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = estimateEventEmissions(req.body as EstimateInput);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
