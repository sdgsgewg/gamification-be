import { BaseTaskAttempt } from './task-attempt-base';

export class ClassTaskAttemptResponseDto extends BaseTaskAttempt {
  class: {
    name: string;
    slug: string;
  };

  totalStudents: number;

  deadline?: string;
}
