import { IsEmail, IsIn, MinLength } from 'class-validator';

export class RegisterStep1Dto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsIn(['student', 'teacher'])
  role: string;
}
