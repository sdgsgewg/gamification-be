import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseModule } from 'src/integrations/supabase/supabase.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/modules/users/users.module';
import { PasswordResetModule } from 'src/modules/password_resets/password-resets.module';
import { UserSessionModule } from 'src/modules/user-sessions/user-sessions.module';
import { MailerModule } from 'src/integrations/mailer/mailer.module';
import { PassportModule } from '@nestjs/passport';
import { User } from 'src/modules/users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SupabaseModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      // Changed from register to registerAsync
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    PasswordResetModule,
    UserSessionModule,
    MailerModule,
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthController, AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
