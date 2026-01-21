import { Task } from 'src/modules/tasks/entities/task.entity';

export class TaskHelper {
  /**
   * Calculate the maximum point of a task.
   * @param task The task.
   * @returns The max point as a number.
   */
  static calculateTaskMaxPoint(task: Task): number {
    return task.taskQuestions.reduce((a, q) => a + q.point, 0);
  }
}
