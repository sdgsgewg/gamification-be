import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordReset } from './entities/password-reset.entity';
import { PasswordResetService } from './password-resets.service';

@Module({
  imports: [TypeOrmModule.forFeature([PasswordReset])],
  //   controllers: [PasswordResetController],
  providers: [PasswordResetService],
  exports: [PasswordResetService], // <== kalau mau dipakai di module lain
})
export class PasswordResetModule {}
