import { supabase } from '../config/supabase';
import { UserRow } from '../types/auth';
import { UserRole } from '../types/models';

export class AuthRepository {
  async findByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (error) {
      throw new Error(error.message || 'Failed to fetch user');
    }
    return (data as UserRow | null) || null;
  }

  async createUser(input: { name: string; email: string; password: string; role?: UserRole }): Promise<UserRow> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role || 'organizer'
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create user');
    }
    return data as UserRow;
  }
}

export const authRepository = new AuthRepository();
