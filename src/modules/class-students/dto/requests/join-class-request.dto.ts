import { IsNotEmpty } from 'class-validator';

export class JoinClassDto {
  @IsNotEmpty()
  classId: string;
}
