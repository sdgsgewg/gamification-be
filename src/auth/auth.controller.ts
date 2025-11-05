import { Request, Response } from 'express';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserSessionService } from 'src/modules/user-sessions/user-sessions.service';
import { ForgotPasswordDto } from './dto/requests/forgot-password.dto';
import { ResetPasswordDto } from './dto/requests/reset-password.dto';
import { LoginDto } from './dto/requests/login.dto';
import { CreateUserDto } from './dto/requests/create-user.dto';
import { CompleteProfileDto } from './dto/requests/complete-profile.dto';
import { AuthGuard } from '@nestjs/passport';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { DetailResponseDto } from 'src/common/responses/detail-response.dto';
import { LoginDetailResponseDto } from './dto/responses/login-detail-response';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly userSessionService: UserSessionService,
  ) {}

  @Post('/register')
  async registerStep1(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('/verify-email')
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('/complete-profile')
  async completeProfile(
    @Body() dto: CompleteProfileDto,
    @Query('uid') userId: string, // Ambil user_id dari query param, bukan dari JWT
  ) {
    return this.authService.completeProfile(userId, dto);
  }

  @Post('/login')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body);

    const { accessToken, refreshToken, user } = result.data;

    const remember = body.remember ?? false;

    const userAgent = req.headers['user-agent'] || 'unknown';

    await this.userSessionService.createSession(
      user.userId,
      refreshToken,
      userAgent,
    );

    // Durasi cookie tergantung "remember me"
    const cookieMaxAge = remember
      ? this.convertExpiryToMs(process.env.REFRESH_TOKEN_EXPIRY)
      : this.convertExpiryToMs('1d'); // 30 hari / 1 hari

    // Set refresh token as HTTP-only cookie
    // Production
    // res.cookie('refresh_token', refreshToken, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'none',
    //   path: '/',
    //   domain: '.inspiraumkm.com',
    // });

    // Development
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: cookieMaxAge,
    });

    const response: DetailResponseDto<LoginDetailResponseDto> = {
      status: 200,
      isSuccess: true,
      message: 'Login successful',
      data: {
        accessToken,
        user,
      },
    };

    return response;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Akan redirect ke Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res({ passthrough: true }) res: Response) {
    const user = req.user;
    // cek apakah user sudah ada di Supabase
    // kalau belum -> buat user baru
    // lalu generate JWT
    const payload = { email: user.email, name: user.name };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: this.convertExpiryToMs(process.env.REFRESH_TOKEN_EXPIRY || '30d'),
    });

    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard?token=${accessToken}`,
    );
  }

  @Post('/refresh')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies['refresh_token'];
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!token) {
      console.warn('No refresh token cookie found');
      throw new UnauthorizedException('No refresh token');
    }

    const session = await this.userSessionService.findValidSession(
      token,
      userAgent,
    );
    if (!session || session.is_revoked) {
      console.warn('Invalid session:', {
        token,
        userAgent,
        sessionExists: !!session,
        isRevoked: session?.is_revoked,
      });
      throw new UnauthorizedException('Session not found or expired');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
        clockTolerance: 30, // 30 detik toleransi perbedaan waktu
        ignoreExpiration: false, // Pastikan false di production
      });

      // Generate new token dengan secret yang sama
      const newAccessToken = this.jwtService.sign(
        {
          id: payload.id || payload.uid, // fallback kalau field-nya uid
          email: payload.email,
          role: payload.role || 'user',
        },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
        },
      );

      return res.json({ accessToken: newAccessToken });
    } catch (err: any) {
      console.warn('Invalid refresh token payload', err.message);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Post('/forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.handleForgotPassword(body);
  }

  @Post('/reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body);
  }

  @Post('/logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies['refresh_token'];

    if (token) {
      await this.userSessionService.deleteSession(token);
    }

    // Production
    // res.clearCookie('refresh_token', {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'none',
    //   path: '/',
    //   domain: '.gamification.com',
    // });

    // Development

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Logged out',
    };

    return response;
  }

  // Helper untuk konversi "15m", "30d" → milliseconds
  private convertExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/); // s=detik, m=menit, h=jam, d=hari
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }
}
