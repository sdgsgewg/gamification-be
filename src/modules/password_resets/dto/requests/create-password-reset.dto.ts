import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePasswordResetDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  @IsString()
  expiresAt: Date;
}
