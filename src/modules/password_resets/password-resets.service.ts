import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordReset } from './entities/password-reset.entity';
import { PasswordResetDetailResponseDto } from './dto/responses/password-reset-detail-reponse.dto';
import { CreatePasswordResetDto } from './dto/requests/create-password-reset.dto';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
  ) {}

  private getPasswordResetDetailData(
    passwordResetWithRelations: PasswordReset,
  ): PasswordResetDetailResponseDto {
    const data: PasswordResetDetailResponseDto = {
      id: passwordResetWithRelations.id,
      token: passwordResetWithRelations.token,
      userId: passwordResetWithRelations.user_id,
      expiresAt: passwordResetWithRelations.expires_at,
      createdAt: passwordResetWithRelations.created_at,
    };

    return data;
  }

  async findPasswordResetBy(
    field: 'id' | 'token' | 'user_id',
    value: string,
  ): Promise<PasswordResetDetailResponseDto> {
    const qb = this.passwordResetRepository
      .createQueryBuilder('password_reset')
      .leftJoinAndSelect('password_reset.user', 'user');

    if (field === 'id') {
      qb.where('password_reset.id = :value', { value });
    } else if (field === 'token') {
      qb.where('password_reset.token = :value', { value });
    } else if (field === 'user_id') {
      qb.where('password_reset.user_id = :value', { value });
    }

    const passwordReset = await qb.getOne();

    if (!passwordReset) {
      return null;
    }

    return this.getPasswordResetDetailData(passwordReset);
  }

  async createPasswordReset(dto: CreatePasswordResetDto): Promise<void> {
    // Buat password reset baru
    const passwordReset = this.passwordResetRepository.create({
      user_id: dto.userId,
      token: dto.token,
      expires_at: dto.expiresAt,
      created_at: new Date(),
    });

    await this.passwordResetRepository.save(passwordReset);
  }

  async deletePasswordResetBy(
    field: 'id' | 'token' | 'user_id',
    value: string,
  ): Promise<void> {
    // cek material dulu
    const passwordReset = await this.findPasswordResetBy(field, value);

    if (passwordReset) {
      if (field === 'id') {
        await this.passwordResetRepository.delete(value);
      } else if (field === 'token') {
        await this.passwordResetRepository.delete({
          token: value,
        });
      } else if (field === 'user_id') {
        await this.passwordResetRepository.delete({
          user_id: value,
        });
      }
    }
  }
}
