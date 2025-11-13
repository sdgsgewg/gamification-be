import { In } from 'typeorm';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { TaskQuestionOption } from 'src/modules/task-question-options/entities/task-question-option.entity';
import { Repository } from 'typeorm';

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
    answerLogs: any[],
    taskQuestionOptionRepository: Repository<TaskQuestionOption>,
  ): Promise<{ points: number; xpGained: number }> {
    let points = 0;

    const optionIds = answerLogs
      .map((a) => a.optionId)
      .filter((id): id is string => !!id);

    if (optionIds.length === 0) {
      return { points: 0, xpGained: 0 };
    }

    const options = await taskQuestionOptionRepository.find({
      where: { task_question_option_id: In(optionIds) },
      relations: ['question'],
    });

    const optionMap = new Map(
      options.map((opt) => [opt.task_question_option_id, opt]),
    );

    for (const ans of answerLogs) {
      if (!ans.optionId) continue;
      const option = optionMap.get(ans.optionId);
      if (option?.is_correct && option.question) {
        points += option.question.point;
      }
    }

    const difficultyRate =
      task.difficulty === 'HARD' ? 3 : task.difficulty === 'MEDIUM' ? 2 : 1.5;

    const xpGained = Math.round(points * difficultyRate);

    return { points, xpGained };
  }
}
