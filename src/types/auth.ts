import { UserRole } from './models';

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: string;
}
