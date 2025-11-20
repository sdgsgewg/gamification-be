import { IsNotEmpty } from 'class-validator';

export class LeaveClassDto {
  @IsNotEmpty()
  classId: string;
}
