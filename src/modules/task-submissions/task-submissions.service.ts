import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskSubmission } from './entities/task-submission.entity';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { CreateTaskSubmissionDto } from './dto/requests/create-task-submission.dto';
import { UpdateTaskSubmissionDto } from './dto/requests/update-task-submission.dto';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import {
  TaskSubmissionStatus,
  TaskSubmissionStatusLabels,
} from './enums/task-submission-status.enum';
import { TaskAttemptStatus } from '../task-attempts/enums/task-attempt-status.enum';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { UserService } from '../users/users.service';
import { TaskXpHelper } from 'src/common/helpers/task-xp.helper';
import { TaskQuestionOption } from '../task-question-options/entities/task-question-option.entity';
import { ActivityLogService } from '../activty-logs/activity-logs.service';
import { ActivityLogEventType } from '../activty-logs/enums/activity-log-event-type';
import { getActivityLogDescription } from 'src/common/utils/get-activity-log-description.util';
import { UserRole } from '../roles/enums/user-role.enum';
import { FilterTaskSubmissionDto } from './dto/requests/filter-task-submission.dto';
import { GroupedTaskSubmissionResponseDto } from './dto/responses/grouped-task-submission-response.dto';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  getDateTime,
  getTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import {
  SubmissionProgress,
  SubmissionSummary,
  TaskDetail,
  TaskSubmissionDetailResponseDto,
} from './dto/responses/task-submission-detail-response.dto';
import { TaskSubmissionWithAnswersResponseDto } from './dto/responses/task-submission-with-answers-response.dto';
import { TaskDifficultyLabels } from '../tasks/enums/task-difficulty.enum';

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
    private readonly activityLogService: ActivityLogService,
  ) {}

  async findAllTaskSubmissions(
    userId: string,
    filterDto: FilterTaskSubmissionDto,
  ): Promise<GroupedTaskSubmissionResponseDto[]> {
    const qb = this.taskSubmissionRepository
      .createQueryBuilder('ts')
      .leftJoinAndSelect('ts.taskAttempt', 'ta')
      .leftJoinAndSelect('ta.class', 'c')
      .leftJoinAndSelect('ta.task', 't')
      .leftJoinAndSelect('ta.student', 's');

    // Filter berdasarkan user id
    qb.where('c.teacher_id = :teacherId', { teacherId: userId });

    // Tambahkan filter status
    if (filterDto.status) {
      qb.andWhere('ts.status = :status', { status: filterDto.status });
    }

    // Filter berdasarkan nama siswa
    if (filterDto.searchText) {
      qb.andWhere('s.name ILIKE :name', { name: `%${filterDto.searchText}%` });
    }

    // Sorting dinamis
    const orderBy = filterDto.orderBy ?? 'ts.created_at';
    const orderState = filterDto.orderState ?? 'ASC';
    qb.orderBy(orderBy, orderState as 'ASC' | 'DESC');

    // Eksekusi query
    const submissions = await qb.getMany();

    if (!submissions.length) {
      throw new NotFoundException(
        `No submission found for teacher with id ${userId}`,
      );
    }

    const groupByGraded = filterDto.status === TaskSubmissionStatus.COMPLETED;

    return this.mapAndGroupTaskSubmissions(submissions, groupByGraded);
  }

  async findTaskSubmissionsInClass(
    classSlug: string,
    taskSlug: string,
    filterDto: FilterTaskSubmissionDto,
  ): Promise<GroupedTaskSubmissionResponseDto[]> {
    const qb = this.taskSubmissionRepository
      .createQueryBuilder('ts')
      .leftJoinAndSelect('ts.taskAttempt', 'ta')
      .leftJoinAndSelect('ta.class', 'c')
      .leftJoinAndSelect('ta.task', 't')
      .leftJoinAndSelect('ta.student', 's');

    // Filter berdasarkan class dan task slug
    qb.where('c.slug = :classSlug', { classSlug }).andWhere(
      't.slug = :taskSlug',
      { taskSlug },
    );

    // Tambahkan filter status
    if (filterDto.status) {
      qb.andWhere('ts.status = :status', { status: filterDto.status });
    }

    // Filter berdasarkan nama siswa
    if (filterDto.searchText) {
      qb.andWhere('s.name ILIKE :name', { name: `%${filterDto.searchText}%` });
    }

    // Sorting dinamis
    const orderBy = filterDto.orderBy ?? 'ts.created_at';
    const orderState = filterDto.orderState ?? 'ASC';
    qb.orderBy(orderBy, orderState as 'ASC' | 'DESC');

    // Eksekusi query
    const submissions = await qb.getMany();

    if (!submissions.length) {
      throw new NotFoundException(
        `No submission found for class with slug ${classSlug} and task with slug ${taskSlug}`,
      );
    }

    const groupByGraded = filterDto.status === TaskSubmissionStatus.COMPLETED;

    return this.mapAndGroupTaskSubmissions(submissions, groupByGraded);
  }

  private mapAndGroupTaskSubmissions(
    submissions: TaskSubmission[],
    groupByGraded: boolean,
  ): GroupedTaskSubmissionResponseDto[] {
    const grouped = submissions.reduce(
      (acc, submission) => {
        const { title, image } = submission.taskAttempt.task;
        const { name: className } = submission.taskAttempt.class;
        const { name: studentName } = submission.taskAttempt.student;
        const {
          task_submission_id,
          status,
          created_at,
          last_graded_at,
          finish_graded_at,
        } = submission;

        // Pilih tanggal berdasarkan mode grouping
        const dateValue = groupByGraded ? finish_graded_at : created_at;
        if (!dateValue) return acc;

        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return acc;

        const dateKey = format(date, 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = {
            dateLabel: format(date, 'd MMM yyyy', { locale: id }),
            dayLabel: format(date, 'EEEE', { locale: id }),
            submissions: [],
          };
        }

        const gradedTime =
          status === TaskSubmissionStatus.COMPLETED
            ? getTime(finish_graded_at)
            : status === TaskSubmissionStatus.ON_PROGRESS
              ? getTime(last_graded_at)
              : getTime(created_at);

        // Map langsung ke DTO kecil di sini
        acc[dateKey].submissions.push({
          id: task_submission_id,
          title,
          image: image !== '' ? image : null,
          className,
          studentName,
          status,
          submittedTime: getTime(created_at),
          gradedTime,
        });

        return acc;
      },
      {} as Record<string, GroupedTaskSubmissionResponseDto>,
    );

    return Object.values(grouped);
  }

  async findTaskSubmissionById(
    id: string,
  ): Promise<TaskSubmissionDetailResponseDto> {
    const submission = await this.taskSubmissionRepository.findOne({
      where: { task_submission_id: id },
      relations: {
        taskAttempt: {
          task: {
            subject: true,
            material: true,
            taskType: true,
            taskGrades: {
              grade: true,
            },
            taskQuestions: {
              taskQuestionOptions: true,
            },
          },
          taskAnswerLogs: {
            question: true,
          },
          student: true,
          class: {
            teacher: true,
          },
        },
      },
      order: {
        taskAttempt: {
          task: {
            taskQuestions: {
              order: 'ASC',
              taskQuestionOptions: {
                order: 'ASC',
              },
            },
          },
          taskAnswerLogs: {
            created_at: 'ASC',
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    // Get student and class name
    const { name: studentName } = submission.taskAttempt.student;
    const { name: className } = submission.taskAttempt.class;

    // Get task detail
    const {
      title,
      slug,
      description,
      image,
      subject,
      material,
      taskGrades,
      taskQuestions,
      difficulty,
      taskType,
    } = submission.taskAttempt.task;

    const taskDetail: TaskDetail = {
      title,
      slug,
      description: description ?? null,
      image: image ?? null,
      subject: subject.name,
      material: material ? material.name : null,
      grade: taskGrades
        .map((tg) => tg.grade.name.replace('Kelas', ''))
        .join(', '),
      questionCount: taskQuestions.length,
      difficulty: TaskDifficultyLabels[difficulty],
      type: taskType.name,
    };

    // Get submission summary
    const { score, feedback, taskAttempt } = submission;
    const { xp_gained } = taskAttempt;
    const pointGained = taskAttempt.taskAnswerLogs.reduce(
      (acc, answer) => acc + (answer.point_awarded ?? 0),
      0,
    );
    const totalPoints = taskAttempt.task.taskQuestions.reduce(
      (acc, question) => acc + (question.point ?? 0),
      0,
    );

    const summary: SubmissionSummary = {
      pointGained,
      totalPoints,
      score,
      xpGained: xp_gained,
      feedback,
    };

    // Get submission progress
    const reviewedQuestionCount = submission.taskAttempt.taskAnswerLogs.filter(
      (answer) => !answer.is_correct,
    ).length;
    const totalQuestionCount = submission.taskAttempt.task.taskQuestions.length;
    const { start_graded_at, last_graded_at, finish_graded_at, status } =
      submission;

    const progress: SubmissionProgress = {
      reviewedQuestionCount,
      totalQuestionCount,
      startGradedAt: start_graded_at ? getDateTime(start_graded_at) : null,
      lastGradedAt: last_graded_at ? getDateTime(last_graded_at) : null,
      finishGradedAt: finish_graded_at ? getDateTime(finish_graded_at) : null,
      duration: finish_graded_at
        ? getTimePeriod(start_graded_at, finish_graded_at)
        : null,
      status: TaskSubmissionStatusLabels[status],
    };

    // Get submission questions

    const { task, taskAnswerLogs } = submission.taskAttempt;

    const questions =
      task.taskQuestions?.map((q) => {
        const userAnswer = taskAnswerLogs.find(
          (log) => log.question_id === q.task_question_id,
        );

        return {
          questionId: q.task_question_id,
          text: q.text,
          point: q.point,
          type: q.type,
          timeLimit: q.time_limit ?? null,
          image: q.image ?? null,
          options: q.taskQuestionOptions?.map((o) => ({
            optionId: o.task_question_option_id,
            text: o.text,
            isCorrect: o.is_correct,
            isSelected: userAnswer?.option_id === o.task_question_option_id,
          })),
          userAnswer: userAnswer
            ? {
                answerLogId: userAnswer.task_answer_log_id,
                text: userAnswer.answer_text,
                image: userAnswer.image,
                optionId: userAnswer.option_id,
                isCorrect: userAnswer.is_correct,
                pointAwarded: userAnswer.point_awarded,
                teacherNotes: userAnswer.teacher_notes,
              }
            : null,
        };
      }) || [];

    const response: TaskSubmissionDetailResponseDto = {
      id,
      studentName,
      className,
      taskDetail,
      summary,
      progress,
      questions,
    };

    return response;
  }

  async findTaskSubmissionWithAnswers(
    id: string,
  ): Promise<TaskSubmissionWithAnswersResponseDto> {
    const submission = await this.taskSubmissionRepository.findOne({
      where: { task_submission_id: id },
      relations: {
        taskAttempt: {
          task: {
            subject: true,
            material: true,
            taskType: true,
            taskGrades: {
              grade: true,
            },
            taskQuestions: {
              taskQuestionOptions: true,
            },
          },
          taskAnswerLogs: {
            question: true,
          },
        },
      },
      order: {
        taskAttempt: {
          task: {
            taskQuestions: {
              order: 'ASC',
              taskQuestionOptions: {
                order: 'ASC',
              },
            },
          },
          taskAnswerLogs: {
            created_at: 'ASC',
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Task submission not found');
    }

    const { task, taskAnswerLogs } = submission.taskAttempt;

    const questions =
      task.taskQuestions?.map((q) => {
        const userAnswer = taskAnswerLogs.find(
          (log) => log.question_id === q.task_question_id,
        );

        return {
          questionId: q.task_question_id,
          text: q.text,
          point: q.point,
          type: q.type,
          timeLimit: q.time_limit ?? null,
          image: q.image ?? null,
          options: q.taskQuestionOptions?.map((o) => ({
            optionId: o.task_question_option_id,
            text: o.text,
            isCorrect: o.is_correct,
            isSelected: userAnswer?.option_id === o.task_question_option_id,
          })),
          userAnswer: userAnswer
            ? {
                answerLogId: userAnswer.task_answer_log_id,
                text: userAnswer.answer_text,
                image: userAnswer.image,
                optionId: userAnswer.option_id,
                isCorrect: userAnswer.is_correct,
                pointAwarded: userAnswer?.point_awarded ?? null,
                teacherNotes: userAnswer?.teacher_notes ?? null,
              }
            : null,
          isCorrect: userAnswer?.is_correct ?? null,
          pointAwarded: userAnswer?.point_awarded ?? null,
          teacherNotes: userAnswer?.teacher_notes ?? null,
        };
      }) || [];

    const response: TaskSubmissionWithAnswersResponseDto = {
      id,
      questions,
    };

    return response;
  }

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
      relations: {
        taskAttempt: {
          taskAnswerLogs: true,
          student: true,
          class: true,
          task: {
            taskQuestions: true,
          },
        },
      },
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

    if (dto.status === TaskSubmissionStatus.COMPLETED) {
      // Hitung total point dari semua jawaban
      const updatedLogs = await this.taskAnswerLogRepository.find({
        where: {
          taskAttempt: { task_attempt_id: taskAttempt.task_attempt_id },
        },
      });

      const { points, xpGained } = await TaskXpHelper.calculatePointsAndXp(
        taskAttempt.task,
        updatedLogs,
      );

      // Total poin maksimal dari seluruh pertanyaan
      const totalPoints = taskAttempt.task.taskQuestions.reduce(
        (acc, q) => acc + q.point,
        0,
      );

      // Hitung skor
      const score =
        totalPoints > 0 ? Math.round((points / totalPoints) * 100) : 0;

      // Update submission summary
      submission.score = score;
      submission.status = TaskSubmissionStatus.COMPLETED;
      submission.last_graded_at = dto.lastGradedAt;
      submission.finish_graded_at = new Date();
      submission.feedback = dto.feedback ?? null;

      // Update TaskAttempt jadi COMPLETED
      taskAttempt.points = points;
      taskAttempt.xp_gained = xpGained;
      taskAttempt.status = TaskAttemptStatus.COMPLETED;
      taskAttempt.completed_at = new Date();

      //  Update level dan XP user
      await this.userService.updateLevelAndXp(taskAttempt.student_id, xpGained);

      // Simpan semua perubahan
      const savedTaskAttempt =
        await this.taskAttemptRepository.save(taskAttempt);
      const savedTaskSubmission =
        await this.taskSubmissionRepository.save(submission);

      // Add event task graded to activity log of teacher
      await this.activityLogService.createActivityLog({
        userId: teacherId,
        eventType: ActivityLogEventType.TASK_GRADED,
        description: getActivityLogDescription(
          ActivityLogEventType.TASK_GRADED,
          'task submission',
          savedTaskAttempt,
          UserRole.TEACHER,
        ),
        metadata: savedTaskSubmission,
      });

      // Add event task graded to activity log of student
      await this.activityLogService.createActivityLog({
        userId: savedTaskAttempt.student_id,
        eventType: ActivityLogEventType.TASK_GRADED,
        description: getActivityLogDescription(
          ActivityLogEventType.TASK_GRADED,
          'task submission',
          savedTaskAttempt,
          UserRole.STUDENT,
        ),
        metadata: savedTaskSubmission,
      });
    } else {
      submission.status = TaskSubmissionStatus.ON_PROGRESS;
      submission.graded_by = teacherId;

      if (!submission.start_graded_at)
        submission.start_graded_at = dto.startGradedAt;

      submission.last_graded_at = dto.lastGradedAt;

      // Simpan semua perubahan
      await this.taskSubmissionRepository.save(submission);
    }

    return {
      status: 200,
      isSuccess: true,
      message: 'Submission has been saved.',
    };
  }
}
