export class PasswordResetDetailResponseDto {
  id: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  userId: string;
}
