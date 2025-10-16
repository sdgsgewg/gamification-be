import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid'; // Optional: untuk generate token
import * as bcrypt from 'bcrypt';
import { MailerService } from 'src/integrations/mailer/mailer.service';
import { LoginDto } from './dto/requests/login.dto';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { CreateUserDto } from './dto/requests/create-user.dto';
import { CompleteProfileDto } from './dto/requests/complete-profile.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { UserService } from 'src/modules/users/users.service';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { PasswordResetService } from 'src/modules/password_resets/password-resets.service';
import { LoginDetailResponseDto } from './dto/responses/login-detail-response';
// import { UserOverviewResponseDto } from 'src/modules/users/dto/responses/user-overview-response.dto';
import { UserDetailResponseDto } from 'src/modules/users/dto/responses/user-detail-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly passwordResetService: PasswordResetService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async register(dto: CreateUserDto): Promise<BaseResponseDto> {
    const { email, password, roleId } = dto;

    try {
      const existingUser = await this.userService.findUserBy('email', email);

      if (existingUser) {
        throw new BadRequestException('Email sudah terdaftar');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const savedUser = await this.userService.createUser({
        email,
        password: hashedPassword,
        roleId,
      });

      // Kirim email verifikasi
      const token = this.jwtService.sign(
        { uid: savedUser.userId },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.EMAIL_VERIFICATION_EXPIRY ?? '1h',
        },
      );

      await this.mailerService.sendEmailVerification(email, token);

      const response: BaseResponseDto = {
        status: 200,
        isSuccess: true,
        message: 'Akun berhasil dibuat. Silakan verifikasi email.',
      };

      return response;
    } catch (error) {
      console.error('Register service error:', error);
      throw error; // Let NestJS handle the HTTP response
    }
  }

  async verifyEmail(token: string): Promise<DetailResponseDto<string>> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const userId = payload.uid;

      this.userService.updateEmailVerifiedAt(userId);

      const response: DetailResponseDto<string> = {
        status: 200,
        isSuccess: true,
        message: 'Email berhasil diverifikasi',
        data: userId,
      };

      return response;
    } catch (e) {
      console.error(e);
      throw new BadRequestException('Token tidak valid atau kadaluwarsa');
    }
  }

  async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<BaseResponseDto> {
    const { name, username, gradeId } = dto;

    await this.userService.updateProfile(userId, name, username, gradeId);

    return {
      status: 200,
      isSuccess: true,
      message: 'Data profil berhasil disimpan',
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<DetailResponseDto<LoginDetailResponseDto>> {
    const { email, password, remember } = loginDto;

    try {
      const existingUser = await this.userService.findUserBy('email', email);

      if (!existingUser) {
        throw new UnauthorizedException('User not found');
      }

      // Check password using bcrypt
      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (!isMatch)
        throw new UnauthorizedException('Invalid email or password');

      // Generate JWT token
      const payload = {
        id: existingUser.userId,
        email: existingUser.email,
        role: existingUser.role.name || 'user',
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
      });
      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: remember ? process.env.REFRESH_TOKEN_EXPIRY || '30d' : '1d',
      });

      const safeUser: UserDetailResponseDto = {
        ...existingUser,
        password: '',
      };

      const data: LoginDetailResponseDto = {
        accessToken,
        refreshToken,
        user: safeUser,
      };

      return {
        status: 200,
        isSuccess: true,
        message: 'Login successful',
        data,
      };
    } catch (error) {
      console.error('Login service error:', error);
      throw error; // Let NestJS handle the HTTP response
    }
  }

  async handleForgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<BaseResponseDto> {
    const { email } = forgotPasswordDto;

    const existingUser = await this.userService.findUserBy('email', email);

    if (!existingUser) {
      console.warn(`Email ${email} tidak ditemukan.`);
      return {
        status: 200,
        isSuccess: true,
        message: 'Jika email Anda terdaftar, tautan reset telah dikirim.',
      };
    }

    const token = uuidv4();
    // Expires dalam 1 jam
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // UTC by default

    try {
      const userId = existingUser.userId;

      // Hapus semua reset token lama untuk user ini
      await this.passwordResetService.deletePasswordResetBy('user_id', userId);

      // Simpan token baru
      await this.passwordResetService.createPasswordReset({
        token,
        expiresAt,
        userId,
      });
    } catch (error) {
      console.error('Insert reset token failed:', error);
      throw new Error('Gagal memproses reset password.');
    }

    // Kirim email reset
    await this.mailerService.sendResetPasswordEmail(existingUser.email, token);

    return {
      status: 200,
      isSuccess: true,
      message: 'Tautan reset telah dikirim.',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<BaseResponseDto> {
    const { token, password: newPassword } = resetPasswordDto;

    const existingPasswordReset =
      await this.passwordResetService.findPasswordResetBy('token', token);

    if (!existingPasswordReset) {
      console.warn(`Token reset ${token} tidak valid.`);
      return {
        status: 401,
        isSuccess: false,
        message: 'Token tidak valid atau sudah kadaluarsa.',
      };
    }

    const now = new Date();

    console.log('Now: ', now.toISOString());
    console.log(
      'Reset password expires at: ',
      new Date(existingPasswordReset.expiresAt).toISOString(),
    );

    if (new Date(existingPasswordReset.expiresAt) < now) {
      console.warn(`Token reset ${token} sudah kadaluarsa.`);
      return {
        status: 401,
        isSuccess: false,
        message: 'Token sudah kadaluarsa.',
      };
    }

    try {
      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const existingUser = await this.userService.findUserBy(
        'id',
        existingPasswordReset.userId,
      );

      if (!existingUser) {
        console.error(
          `User dengan ID ${existingPasswordReset.userId} tidak ditemukan.`,
        );
        return {
          status: 404,
          isSuccess: false,
          message: 'User tidak ditemukan.',
        };
      }

      await this.userService.updatePassword(
        existingPasswordReset.userId,
        hashedPassword,
      );

      // Hapus token
      await this.passwordResetService.deletePasswordResetBy(
        'token',
        existingPasswordReset.token,
      );

      return {
        status: 200,
        isSuccess: true,
        message: 'Password berhasil diperbarui.',
      };
    } catch (error) {
      console.error('Gagal reset password:', error);
      throw new Error('Terjadi kesalahan saat memperbarui password.');
    }
  }
}
