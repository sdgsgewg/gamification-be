import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid'; // Optional: untuk generate token
import { addMinutes } from 'date-fns';
import * as bcrypt from 'bcrypt';
import { MailerService } from 'src/mailer/mailer.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterStep1Dto } from './dto/register-step1.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async registerStep1(dto: RegisterStep1Dto) {
    const { email, password, role } = dto;
    const supabase = this.supabaseService.getClient();

    try {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (existingUsers) {
        throw new BadRequestException('Email sudah terdaftar');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      await supabase.from('users').insert({
        user_id: userId,
        email,
        password: hashedPassword,
        role,
        level: 1,
        xp: 0,
        created_at: new Date().toISOString(),
      });

      // Kirim email verifikasi
      const token = this.jwtService.sign(
        { uid: userId },
        { secret: process.env.JWT_SECRET, expiresIn: '1h' },
      );

      await this.mailerService.sendEmailVerification(email, token);

      return { message: 'Akun berhasil dibuat. Silakan verifikasi email.' };
    } catch (error) {
      console.error('Login service error:', error);
      throw error; // Let NestJS handle the HTTP response
    }
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const supabase = this.supabaseService.getClient();

      await supabase
        .from('users')
        .update({ email_verified_at: new Date().toISOString() })
        .eq('user_id', payload.uid);

      return { message: 'Email berhasil diverifikasi', userId: payload.uid };
    } catch (e) {
      throw new BadRequestException('Token tidak valid atau kadaluwarsa');
    }
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const { name, username, gradeId } = dto;

    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('Username sudah digunakan');
    }

    await supabase
      .from('users')
      .update({
        name,
        username,
        grade_id: gradeId || null,
      })
      .eq('user_id', userId);

    return { message: 'Data profil berhasil disimpan' };
  }

  async login(loginDto: LoginDto) {
    const { email, password, remember } = loginDto;

    try {
      const supabase = this.supabaseService.getClient();
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error('Database error');
      }

      if (!users || users.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      const user = users[0];

      // Check password using bcrypt
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        throw new UnauthorizedException('Invalid email or password');

      // Generate JWT token
      const payload = {
        uid: user.user_id,
        email: user.email,
        role: user.role || 'user',
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY,
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
      });
      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY,
        expiresIn: remember ? process.env.REFRESH_TOKEN_EXPIRY || '30d' : '1d',
      });

      // (optional) remove password from returned data
      const { password: _, ...safeUser } = user;

      return {
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: safeUser,
      };
    } catch (error) {
      console.error('Login service error:', error);
      throw error; // Let NestJS handle the HTTP response
    }
  }

  async handleForgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const supabase = this.supabaseService.getClient();

    // Cari user berdasarkan email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !users) {
      // Kamu bisa abaikan atau kirim response tetap sukses demi keamanan
      console.warn(`Email ${email} tidak ditemukan.`);
      return {
        message: 'If your email is registered, a reset link has been sent.',
      };
    }

    const user = users;
    const token = uuidv4();
    const expiresAt = addMinutes(new Date(), 15).toISOString();

    // Hapus semua reset token lama untuk user ini
    await supabase.from('password_resets').delete().eq('user_id', user.user_id);

    // Simpan ke tabel reset token (buat tabel `password_resets`)
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert([
        {
          user_id: user.user_id,
          token,
          expires_at: expiresAt,
        },
      ]);

    if (insertError) {
      console.error('Insert reset token failed:', insertError);
      throw new Error('Failed to initiate password reset.');
    }

    // Kirim email (optional tergantung implementasi)
    await this.mailerService.sendResetPasswordEmail(user.email, token);

    return { message: 'Reset link has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password: newPassword } = resetPasswordDto;

    const supabase = this.supabaseService.getClient();

    const { data: resetRecord, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !resetRecord) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const now = new Date();
    if (new Date(resetRecord.expires_at) < now) {
      throw new UnauthorizedException('Token expired');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('user_id', resetRecord.user_id);

    if (updateError) {
      console.error(updateError);
      throw new Error('Failed to update password');
    }

    // Hapus token
    await supabase.from('password_resets').delete().eq('token', token);

    return { message: 'Password updated successfully' };
  }
}
