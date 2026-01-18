import { BaseStudentAttempt } from './student-attempt-base';

export class ClassTaskStudentAttemptResponseDto extends BaseStudentAttempt {
  class: {
    name: string;
  };
}
