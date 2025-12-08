import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid'; // Optional: untuk generate token
import * as bcrypt from 'bcrypt';
// import { MailerService } from 'src/integrations/mailer/mailer.service';
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
import { UpdateUserDto } from 'src/modules/users/dto/requests/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly passwordResetService: PasswordResetService,
    private readonly jwtService: JwtService,
    // private readonly mailerService: MailerService,
  ) {}

  // async register(dto: CreateUserDto): Promise<BaseResponseDto> {
  //   const { email, password, roleId } = dto;

  //   try {
  //     const existingUser = await this.userService.findUserBy('email', email);

  //     if (existingUser) {
  //       throw new BadRequestException('Email is already registered');
  //     }

  //     const hashedPassword = await bcrypt.hash(password, 10);

  //     const savedUser = await this.userService.createUser({
  //       email,
  //       password: hashedPassword,
  //       roleId,
  //     });

  //     // Kirim email verifikasi
  //     const token = this.jwtService.sign(
  //       { uid: savedUser.userId },
  //       {
  //         secret: process.env.JWT_SECRET,
  //         expiresIn: process.env.EMAIL_VERIFICATION_EXPIRY ?? '1h',
  //       },
  //     );

  //     try {
  //       await this.mailerService.sendEmailVerification(email, token);
  //     } catch (err) {
  //       console.error('Email failed to send:', err);
  //       // Jangan throw, biarkan register tetap success
  //     }

  //     const response: BaseResponseDto = {
  //       status: 200,
  //       isSuccess: true,
  //       message: 'Account successfully created. Please verify your email.',
  //     };

  //     return response;
  //   } catch (error) {
  //     console.error('Register service error:', error);
  //   }
  // }

  async register(
    dto: CreateUserDto,
  ): Promise<DetailResponseDto<UserDetailResponseDto>> {
    const { email, password, roleId } = dto;

    try {
      const existingUser = await this.userService.findUserBy('email', email);

      if (existingUser) {
        const response: DetailResponseDto<UserDetailResponseDto> = {
          status: 400,
          isSuccess: false,
          message: 'Email is already registered',
          data: existingUser,
        };

        return response;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const savedUser = await this.userService.createUser({
        email,
        password: hashedPassword,
        roleId,
      });

      const response: DetailResponseDto<UserDetailResponseDto> = {
        status: 200,
        isSuccess: true,
        message: 'Account successfully created. Please complete your profile.',
        data: savedUser,
      };

      return response;
    } catch (error) {
      console.error('Register service error:', error);
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
        message: 'Email successfully verified',
        data: userId,
      };

      return response;
    } catch (e) {
      console.error(e);
      throw new BadRequestException('The token is invalid or expired');
    }
  }

  async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<BaseResponseDto> {
    const { name, username, gradeId } = dto;

    const payload: UpdateUserDto = {
      name,
      username,
      gradeId,
    };

    await this.userService.updateProfile(userId, payload);

    return {
      status: 200,
      isSuccess: true,
      message: 'Profile data saved successfully',
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
        remember,
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
    // try {
    //   await this.mailerService.sendResetPasswordEmail(
    //     existingUser.email,
    //     token,
    //   );
    // } catch (err) {
    //   console.error('Email failed to send:', err);
    //   // Jangan throw, biarkan register tetap success
    // }

    return {
      status: 200,
      isSuccess: true,
      message: 'A reset link has been sent.',
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
        message: 'The token is invalid or has expired.',
      };
    }

    const now = new Date();

    if (new Date(existingPasswordReset.expiresAt) < now) {
      console.warn(`Token reset ${token} sudah kadaluarsa.`);
      return {
        status: 401,
        isSuccess: false,
        message: 'Token has expired.',
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
          message: 'User not found.',
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
        message: 'Password has been updated.',
      };
    } catch (error) {
      console.error('Gagal reset password:', error);
      throw new Error('An error occurred while updating the password.');
    }
  }
}
