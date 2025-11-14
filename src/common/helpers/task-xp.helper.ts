import { Task } from 'src/modules/tasks/entities/task.entity';
import { TaskDifficulty } from 'src/modules/tasks/enums/task-difficulty.enum';
import { TaskAnswerLog } from 'src/modules/task-answer-logs/entities/task-answer-log.entity';

export class TaskXpHelper {
  /**
   * Hitung total poin dan XP yang didapatkan dari pengerjaan tugas.
   * Rumus:
   * xpBaseRate:
   * - HARD = 3
   * - MEDIUM = 2
   * - EASY = 1.5
   * total points: points (jumlah poin benar dari seluruh soal)  * xpBaseRate
   */
  static async calculatePointsAndXp(
    task: Task,
    answerLogs: TaskAnswerLog[],
  ): Promise<{ points: number; xpGained: number }> {
    let points = 0;

    const optionIds = answerLogs
      .map((a) => a.option_id)
      .filter((id): id is string => !!id);

    if (optionIds.length === 0) {
      return { points: 0, xpGained: 0 };
    }

    for (const ans of answerLogs) {
      points += ans.point_awarded;
    }

    const difficultyRate =
      task.difficulty === TaskDifficulty.HARD
        ? 3
        : task.difficulty === TaskDifficulty.MEDIUM
          ? 2
          : 1.5;

    const xpGained = Math.round(points * difficultyRate);

    return { points, xpGained };
  }
}
