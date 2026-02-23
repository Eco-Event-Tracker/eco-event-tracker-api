import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { LoginRequest, SignupRequest } from '../types/auth';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as SignupRequest;
    const result = await authService.signup(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as LoginRequest;
    const result = await authService.login(payload);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
