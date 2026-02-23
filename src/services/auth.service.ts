import crypto from 'crypto';
import { authRepository } from '../repositories/auth.repository';
import { LoginRequest, SignupRequest } from '../types/auth';
import { env } from '../config/env';

const hashPassword = (password: string) => crypto.createHash('sha256').update(password).digest('hex');

const buildBasicToken = (userId: string, email: string) => {
  const payload = `${userId}:${email}:${Date.now()}`;
  const secret = env.supabaseServiceRoleKey || 'dev-secret';
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
};

export class AuthService {
  async signup(input: SignupRequest) {
    if (!input.name?.trim()) {
      throw Object.assign(new Error('name is required'), { statusCode: 400 });
    }
    if (!input.email?.trim()) {
      throw Object.assign(new Error('email is required'), { statusCode: 400 });
    }
    if (!input.password || input.password.length < 6) {
      throw Object.assign(new Error('password must be at least 6 characters'), { statusCode: 400 });
    }

    const email = input.email.trim().toLowerCase();
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      throw Object.assign(new Error('email already exists'), { statusCode: 409 });
    }

    const user = await authRepository.createUser({
      name: input.name.trim(),
      email,
      password: hashPassword(input.password)
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: buildBasicToken(user.id, user.email)
    };
  }

  async login(input: LoginRequest) {
    if (!input.email?.trim() || !input.password) {
      throw Object.assign(new Error('email and password are required'), { statusCode: 400 });
    }

    const email = input.email.trim().toLowerCase();
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw Object.assign(new Error('invalid credentials'), { statusCode: 401 });
    }

    const hashedInput = hashPassword(input.password);
    if (user.password !== hashedInput) {
      throw Object.assign(new Error('invalid credentials'), { statusCode: 401 });
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: buildBasicToken(user.id, user.email)
    };
  }
}

export const authService = new AuthService();
