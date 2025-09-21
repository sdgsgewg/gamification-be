import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseModule } from 'src/integrations/supabase/supabase.module';
import { JwtModule } from '@nestjs/jwt';
import { UserSessionModule } from 'src/modules/user-sessions/user-sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailerModule } from 'src/integrations/mailer/mailer.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SupabaseModule,
    JwtModule.registerAsync({
      // Changed from register to registerAsync
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    UserSessionModule,
    MailerModule,
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthController, AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
