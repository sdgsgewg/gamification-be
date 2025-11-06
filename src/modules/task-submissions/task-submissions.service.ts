import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskSubmission } from './entities/task-submission.entity';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { CreateTaskSubmissionDto } from './dto/requests/create-task-submission.dto';
import { UpdateTaskSubmissionDto } from './dto/requests/update-task-submission.dto';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { TaskSubmissionStatus } from './enums/task-submission-status.enum';
import { TaskAttemptStatus } from '../task-attempts/enums/task-attempt-status.enum';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { UserService } from '../users/users.service';
import { TaskXpHelper } from 'src/common/helpers/task-xp.helper';
import { TaskQuestionOption } from '../task-question-options/entities/task-question-option.entity';

@Injectable()
export class TaskSubmissionService {
  constructor(
    @InjectRepository(TaskSubmission)
    private readonly taskSubmissionRepository: Repository<TaskSubmission>,
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
    @InjectRepository(TaskAnswerLog)
    private readonly taskAnswerLogRepository: Repository<TaskAnswerLog>,
    @InjectRepository(TaskQuestionOption)
    private readonly taskQuestionOptionRepository: Repository<TaskQuestionOption>,
    private readonly userService: UserService,
  ) {}

  // async findAllTaskSubmissionsByStudents(
  //   userId: string,
  //   filterDto: FilterTaskAttemptDto,
  // ): Promise<GroupedTaskAttemptResponseDto[]> {}

  // async findTaskSubmissionById(submissionId: string) {}

  // ================================
  // 📦 CREATE TASK SUBMISSION
  // ================================
  async createTaskSubmission(
    dto: CreateTaskSubmissionDto,
  ): Promise<BaseResponseDto> {
    const { taskAttemptId } = dto;

    const taskSubmission = this.taskSubmissionRepository.create({
      task_attempt_id: taskAttemptId,
    });

    await this.taskSubmissionRepository.save(taskSubmission);

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Task submission has been created!',
    };

    return response;
  }

  /**
   * Update score, feedback, isCorrect status of answer, and additional notes for each answer
   */
  async updateTaskSubmission(
    id: string,
    teacherId: string,
    dto: UpdateTaskSubmissionDto,
  ): Promise<BaseResponseDto> {
    const submission = await this.taskSubmissionRepository.findOne({
      where: { task_submission_id: id },
      relations: [
        'taskAttempt',
        'taskAttempt.taskAnswerLogs',
        'taskAttempt.student',
        'taskAttempt.task',
      ],
    });

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    const { taskAttempt } = submission;

    // Update setiap jawaban
    for (const ans of dto.answers) {
      await this.taskAnswerLogRepository.update(ans.answerLogId, {
        is_correct: ans.isCorrect,
        point_awarded: ans.pointAwarded ?? null,
        teacher_notes: ans.teacherNotes ?? null,
      });
    }

    // Hitung total point dari semua jawaban
    const updatedLogs = await this.taskAnswerLogRepository.find({
      where: { taskAttempt: { task_attempt_id: taskAttempt.task_attempt_id } },
    });

    const { points, xpGained } = await TaskXpHelper.calculatePointsAndXp(
      taskAttempt.task,
      updatedLogs,
      this.taskQuestionOptionRepository,
    );

    // Update submission summary
    submission.score = dto.score;
    submission.feedback = dto.feedback ?? null;
    submission.status = TaskSubmissionStatus.COMPLETED;
    submission.graded_by = teacherId;
    submission.graded_at = new Date();

    // Update TaskAttempt jadi COMPLETED
    taskAttempt.points = points;
    taskAttempt.xp_gained = xpGained;
    taskAttempt.status = TaskAttemptStatus.COMPLETED;
    taskAttempt.completed_at = new Date();

    //  Update level dan XP user
    await this.userService.updateLevelAndXp(taskAttempt.student_id, xpGained);

    // Simpan semua perubahan
    await this.taskSubmissionRepository.save(submission);
    await this.taskAttemptRepository.save(taskAttempt);

    return {
      status: 200,
      isSuccess: true,
      message: 'Koreksi tugas berhasil disimpan!',
    };
  }
}
