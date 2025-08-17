import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as dayjs from 'dayjs';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class UserSessionService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async createSession(userId: string, refreshToken: string, userAgent: string) {
    const { error } = await this.supabaseService.getClient()
      .from('user_sessions')
      .insert({
        user_id: userId,
        refresh_token: refreshToken,
        device_info: userAgent,
        expires_at: dayjs().add(30, 'days').toISOString(),
      });

    if (error) throw new Error(`Create session failed: ${error.message}`);
  }

  async findValidSession(refreshToken: string, userAgent: string) {
    const { data, error } = await this.supabaseService.getClient()
      .from('user_sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .eq('device_info', userAgent)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error) return null;
    return data;
  }

  async deleteSession(refreshToken: string) {
    const { error } = await this.supabaseService.getClient()
      .from('user_sessions')
      .delete()
      .eq('refresh_token', refreshToken);

    if (error) throw new Error(`Delete session failed: ${error.message}`);
  }
}
