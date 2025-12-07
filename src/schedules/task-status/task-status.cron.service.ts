import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { TaskAttempt } from '../../modules/task-attempts/entities/task-attempt.entity';
import { ClassTask } from '../../modules/class-tasks/entities/class-task.entity';
import { TaskAttemptStatus } from '../../modules/task-attempts/enums/task-attempt-status.enum';

@Injectable()
export class TaskStatusCronService {
  private readonly logger = new Logger(TaskStatusCronService.name);

  constructor(
    @InjectRepository(TaskAttempt)
    private readonly attemptRepo: Repository<TaskAttempt>,

    @InjectRepository(ClassTask)
    private readonly classTaskRepo: Repository<ClassTask>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpireTasks() {
    const now = new Date();

    // Ambil semua attempts yang belum submitted
    const attempts = await this.attemptRepo.find({
      where: {
        status: Not(TaskAttemptStatus.SUBMITTED),
      },
    });

    if (attempts.length === 0) return;

    let updatedCount = 0;

    for (const attempt of attempts) {
      const classTask = await this.classTaskRepo.findOne({
        where: {
          class_id: attempt.class_id,
          task_id: attempt.task_id,
        },
      });

      if (!classTask) continue;

      // Jika deadline lewat → update status
      if (classTask.end_time && classTask.end_time < now) {
        attempt.status = TaskAttemptStatus.PAST_DUE;
        await this.attemptRepo.save(attempt);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      this.logger.log(`Updated ${updatedCount} attempts to PAST_DUE`);
    }
  }
}
