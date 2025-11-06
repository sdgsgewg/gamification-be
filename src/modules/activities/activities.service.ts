import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository, SelectQueryBuilder } from 'typeorm';
import { FilterActivityDto } from './dto/requests/filter-activity.dto';
import { Task } from '../tasks/entities/task.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { ActivityOverviewResponseDto } from './dto/responses/activity-overview-response.dto';
import {
  CurrentAttempt,
  RecentAttempt,
  ActivityDetailResponseDto,
} from './dto/responses/activity-detail-response.dto';
import {
  getDateTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import { ActivityWithQuestionsResponseDto } from './dto/responses/activity-with-questions-response.dto';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { ActivitySummaryResponseDto } from './dto/responses/activity-summary-response.dto';
import { TaskTypeScope } from '../task-types/enums/task-type-scope.enum';
import { TaskAttemptStatus } from '../task-attempts/enums/task-attempt-status.enum';
import { TaskDifficultyLabels } from '../tasks/enums/task-difficulty.enum';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
    @InjectRepository(TaskAnswerLog)
    private readonly taskAnswerLogRepository: Repository<TaskAnswerLog>,
  ) {}

  // ==========================
  // 📦 MAIN QUERY
  // ==========================
  async findAllActivities(
    filterDto: FilterActivityDto,
  ): Promise<ActivityOverviewResponseDto[]> {
    const {
      section,
      searchText,
      subjectId,
      materialId,
      taskTypeId,
      gradeIds,
      userId,
    } = filterDto;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.subject', 'subject')
      .leftJoin('task.material', 'material')
      .leftJoin('task.taskType', 'taskType')
      .leftJoin('task.taskGrades', 'taskGrade')
      .leftJoin('taskGrade.grade', 'grade')
      .leftJoin('task.taskQuestions', 'taskQuestions')
      .select([
        'task.task_id AS taskId',
        'task.title AS title',
        'task.slug AS slug',
        'task.image AS image',
        'taskType.name AS taskType',
        'subject.name AS subject',
        `STRING_AGG(DISTINCT REPLACE(grade.name, 'Kelas ', ''), ', ') AS taskGrade`,
      ])
      .addSelect(
        'COUNT(DISTINCT taskQuestions.task_question_id)',
        'questionCount',
      )
      .where('taskType.scope IN (:...scopes)', {
        scopes: [TaskTypeScope.ACTIVITY, TaskTypeScope.GLOBAL],
      })
      .groupBy('task.task_id')
      .addGroupBy('taskType.name')
      .addGroupBy('subject.name');

    // 🔍 Filters
    this.applyCommonFilters(qb, {
      searchText,
      subjectId,
      materialId,
      taskTypeId,
      gradeIds,
    });

    // 👤 User attempts
    if (userId) {
      const attemptSub = this.buildUserAttemptSubQuery(userId);
      qb.leftJoin(
        `(${attemptSub.getQuery()})`,
        'attempt',
        'attempt.task_id = task.task_id',
      )
        .setParameters(attemptSub.getParameters())
        .addSelect('COALESCE(MAX(attempt.answeredcount), 0)', 'answeredcount');
    } else {
      qb.addSelect('0', 'answeredCount');
    }

    // 🏷️ Sections
    if (section) {
      switch (section.toLowerCase()) {
        case 'top':
          this.applyTopSection(qb);
          break;
        case 'latest':
          this.applyLatestSection(qb);
          break;
        case 'continue':
          if (userId) this.applyContinueSection(qb, userId);
          break;
        case 'recommended':
          if (userId) await this.applyRecommendedSection(qb, userId);
          break;
      }
    }

    const raw = await qb.getRawMany();

    return raw.map((t) => ({
      id: t.taskid ?? t.taskId,
      title: t.title,
      slug: t.slug,
      image: t.image,
      type: t.tasktype ?? t.taskType,
      subject: t.subject,
      grade: t.taskgrade ?? (t.taskGrade || null),
      questionCount: Number(t.questioncount ?? t.questionCount) || 0,
      answeredCount: Number(t.answeredcount ?? t.answeredCount) || 0,
    }));
  }

  // ==========================
  // 🧩 FILTERS
  // ==========================
  private applyCommonFilters(
    qb: SelectQueryBuilder<Task>,
    { searchText, subjectId, materialId, taskTypeId, gradeIds }: any,
  ) {
    if (searchText)
      qb.andWhere('task.title ILIKE :searchText', {
        searchText: `%${searchText}%`,
      });
    if (subjectId) qb.andWhere('task.subject_id = :subjectId', { subjectId });
    if (materialId)
      qb.andWhere('task.material_id = :materialId', { materialId });
    if (taskTypeId)
      qb.andWhere('task.task_type_id = :taskTypeId', { taskTypeId });
    if (gradeIds?.length)
      qb.andWhere('taskGrade.grade_id IN (:...gradeIds)', { gradeIds });
  }

  // ==========================
  // 🧱 SUBQUERY BUILDER
  // ==========================
  private buildUserAttemptSubQuery(userId: string, includeCompleted = true) {
    const sub = this.taskAttemptRepository
      .createQueryBuilder('ta')
      .distinctOn(['ta.task_id'])
      .select([
        'ta.task_id AS task_id',
        'ta.task_attempt_id AS task_attempt_id',
        'ta.answered_question_count AS answeredcount',
        'ta.last_accessed_at AS lastaccessedat',
        'ta.completed_at AS completedat',
        'ta.status AS status',
        'ta.started_at AS startedat',
      ])
      .where('ta.student_id = :userId', { userId })
      .orderBy('ta.task_id')
      .addOrderBy('ta.last_accessed_at', 'DESC');

    if (!includeCompleted)
      sub.andWhere('ta.status != :completed', { completed: 'completed' });

    return sub;
  }

  // ==========================
  // 📊 SECTIONS
  // ==========================
  private applyTopSection(qb: SelectQueryBuilder<Task>) {
    qb.leftJoin('task.taskAttempts', 'taskAttemptTop')
      .addSelect('COUNT(taskAttemptTop.task_attempt_id)', 'attemptCount')
      .orderBy('COUNT(taskAttemptTop.task_attempt_id)', 'DESC')
      .limit(10);
  }

  private applyLatestSection(qb: SelectQueryBuilder<Task>) {
    qb.orderBy('task.created_at', 'DESC').limit(10);
  }

  private applyContinueSection(qb: SelectQueryBuilder<Task>, userId: string) {
    const sub = this.buildUserAttemptSubQuery(userId, false);
    qb.innerJoin(
      `(${sub.getQuery()})`,
      'attemptcont',
      'attemptcont.task_id = task.task_id',
    )
      .setParameters(sub.getParameters())
      // tambahkan kolom agar alias dikenal oleh Postgres
      .addSelect('MAX(attemptcont.answeredcount)', 'answeredcount')
      .addSelect('MAX(attemptcont.startedat)', 'startedat')
      .orderBy('MAX(attemptcont.startedat)', 'DESC');
  }

  private async applyRecommendedSection(
    qb: SelectQueryBuilder<Task>,
    userId: string,
  ) {
    const favSubjects = await this.getUserMostAttemptedSubjects(userId);

    if (favSubjects.length > 0) {
      qb.andWhere('subject.name IN (:...favSubjects)', { favSubjects });
    }

    // exclude tasks that are in "continue" section
    const continueSub = this.buildUserAttemptSubQuery(userId, false);
    qb.andWhere(
      `task.task_id NOT IN (
      SELECT task_id FROM (${continueSub.getQuery()}) AS sub
    )`,
    ).setParameters(continueSub.getParameters());

    qb.orderBy('task.created_at', 'DESC').limit(10);
  }

  // ==========================
  // 📘 HELPER
  // ==========================
  private async getUserMostAttemptedSubjects(
    userId: string,
  ): Promise<string[]> {
    const res = await this.taskAttemptRepository
      .createQueryBuilder('ta')
      .leftJoin('ta.task', 'task')
      .leftJoin('task.subject', 'subject')
      .select('subject.name', 'subjectName')
      .addSelect('COUNT(*)', 'attemptCount')
      .where('ta.student_id = :userId', { userId })
      .andWhere('ta.status = :status', { status: 'completed' })
      .groupBy('subject.name')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    if (res.length === 0) return [];

    const maxCount = Number(res[0].attemptCount);

    // Ambil semua subject yang punya count sama dengan maxCount
    return res
      .filter((r) => Number(r.attemptCount) === maxCount)
      .map((r) => r.subjectName);
  }

  // ==========================
  // 🔍 DETAIL FETCH
  // ==========================
  async findActivityBySlug(slug: string, userId?: string) {
    // Ambil task dulu (selalu dari tabel tasks)
    const task = await this.taskRepository.findOne({
      where: { slug },
      relations: {
        subject: true,
        material: true,
        taskType: true,
        taskGrades: { grade: true },
        taskQuestions: true,
      },
      order: { taskQuestions: { order: 'ASC' } },
    });

    if (!task)
      throw new NotFoundException(`Activity with slug ${slug} not found`);

    // Default metadata
    let currAttemptMeta: CurrentAttempt = {
      answeredCount: 0,
      startedAt: null,
      lastAccessedAt: null,
      status: TaskAttemptStatus.NOT_STARTED,
    };

    let recentAttemptMeta: RecentAttempt = {
      startedAt: null,
      lastAccessedAt: null,
      completedAt: null,
      status: TaskAttemptStatus.NOT_STARTED,
    };

    // Kalau userId ada → cari attempt user
    if (userId) {
      const currAttempt = await this.taskAttemptRepository.findOne({
        where: { student_id: userId, task: { slug } },
        order: { last_accessed_at: 'DESC' },
      });

      if (currAttempt) {
        currAttemptMeta = {
          answeredCount: currAttempt.answered_question_count ?? 0,
          startedAt: getDateTime(currAttempt.started_at) ?? null,
          lastAccessedAt: getDateTime(currAttempt.last_accessed_at) ?? null,
          status:
            (currAttempt.status as TaskAttemptStatus) ??
            TaskAttemptStatus.NOT_STARTED,
        };
      }

      const recentAttempt = await this.taskAttemptRepository.findOne({
        where: {
          student_id: userId,
          task: { slug },
          status: TaskAttemptStatus.COMPLETED,
        },
        order: { completed_at: 'DESC' },
      });

      if (recentAttempt) {
        recentAttemptMeta = {
          startedAt: getDateTime(recentAttempt.started_at) ?? null,
          lastAccessedAt: getDateTime(recentAttempt.last_accessed_at) ?? null,
          completedAt: getDateTime(recentAttempt.completed_at),
          status:
            (recentAttempt.status as TaskAttemptStatus) ??
            TaskAttemptStatus.NOT_STARTED,
        };
      }
    }

    // Mapping ke DTO final
    return this.mapActivityBySlugResponse(
      task,
      currAttemptMeta,
      recentAttemptMeta,
    );
  }

  private mapActivityBySlugResponse(
    task: Task,
    currAttemptMeta: CurrentAttempt,
    recentAttemptMeta: RecentAttempt,
  ): ActivityDetailResponseDto {
    const {
      task_id,
      title,
      slug,
      description,
      image,
      difficulty,
      subject,
      material,
      taskGrades,
      taskQuestions,
      taskType,
      start_time,
      end_time,
    } = task;

    return {
      id: task_id,
      title: title,
      slug: slug,
      description: description ?? null,
      image: image ?? null,
      subject: subject ? { id: subject.subject_id, name: subject.name } : null,
      material: material
        ? { id: material.material_id, name: material.name }
        : null,
      grade:
        taskGrades.length > 0
          ? taskGrades
              .map((tg) => tg.grade?.name.replace('Kelas ', ''))
              .join(', ')
          : null,
      questionCount: taskQuestions.length || 0,
      difficulty: TaskDifficultyLabels[difficulty],
      createdBy: task.created_by || 'Unknown',
      type: {
        id: taskType.task_type_id,
        name: taskType.name,
        isRepeatable: taskType.is_repeatable,
      },
      currAttempt:
        currAttemptMeta.status === TaskAttemptStatus.ON_PROGRESS
          ? {
              answeredCount: Number(currAttemptMeta.answeredCount) || 0,
              startedAt: currAttemptMeta.startedAt,
              lastAccessedAt: currAttemptMeta.lastAccessedAt,
              status: currAttemptMeta.status,
            }
          : null,
      recentAttempt: recentAttemptMeta.completedAt
        ? {
            startedAt: recentAttemptMeta.startedAt,
            lastAccessedAt: recentAttemptMeta.lastAccessedAt,
            completedAt: recentAttemptMeta.completedAt,
            status: recentAttemptMeta.status,
          }
        : null,
      duration: {
        startTime: start_time ?? null,
        endTime: end_time ?? null,
        duration: getTimePeriod(start_time, end_time),
      },
    };
  }

  async findActivityWithQuestions(slug: string, userId?: string) {
    // Ambil task dulu dari tabel tasks
    const task = await this.taskRepository.findOne({
      where: { slug },
      relations: {
        taskQuestions: { taskQuestionOptions: true },
      },
      order: {
        taskQuestions: {
          order: 'ASC',
          taskQuestionOptions: { order: 'ASC' },
        },
      },
    });

    if (!task)
      throw new NotFoundException(`Activity with slug ${slug} not found`);

    // Default values
    let lastAttemptId: string | null = null;
    let attemptAnswerLogs: TaskAnswerLog[] = [];

    // Kalau userId ada → ambil attempt dan jawaban user (kalau ada)
    if (userId) {
      const latestAttempt = await this.taskAttemptRepository.findOne({
        where: {
          student_id: userId,
          task: { slug },
          status: Not(TaskAttemptStatus.COMPLETED),
        },
        order: { last_accessed_at: 'DESC' },
      });

      if (latestAttempt) {
        lastAttemptId = latestAttempt.task_attempt_id;

        attemptAnswerLogs = await this.taskAnswerLogRepository.find({
          where: { task_attempt_id: latestAttempt.task_attempt_id },
          relations: ['question', 'option'],
        });
      }
    }

    // Return DTO
    return this.mapActivityWithQuestionsResponse(
      task,
      lastAttemptId,
      attemptAnswerLogs,
    );
  }

  private mapActivityWithQuestionsResponse(
    taskWithRelations: Task,
    lastAttemptId?: string | null,
    attemptAnswerLogs: TaskAnswerLog[] = [],
  ): ActivityWithQuestionsResponseDto {
    const data: ActivityWithQuestionsResponseDto = {
      id: taskWithRelations.task_id,
      lastAttemptId: lastAttemptId ?? null,
      startTime: taskWithRelations.start_time ?? null,
      endTime: taskWithRelations.end_time ?? null,
      duration: getTimePeriod(
        taskWithRelations.start_time,
        taskWithRelations.end_time,
      ),
      questions:
        taskWithRelations.taskQuestions?.map((q) => {
          const userAnswer = attemptAnswerLogs.find(
            (log) => log.question_id === q.task_question_id,
          );

          return {
            questionId: q.task_question_id,
            text: q.text,
            point: q.point,
            type: q.type,
            timeLimit: q.time_limit && q.time_limit > 0 ? q.time_limit : null,
            image: q.image ?? null,
            options: q.taskQuestionOptions?.map((o) => ({
              optionId: o.task_question_option_id,
              text: o.text,
              isCorrect: o.is_correct,
              // Auto-fill: tandai jawaban user
              isSelected: userAnswer?.option_id === o.task_question_option_id,
            })),
            // Tambahkan jawaban text atau image user (jika ada)
            userAnswer: userAnswer
              ? {
                  answerLogId: userAnswer.task_answer_log_id,
                  text: userAnswer.answer_text,
                  image: userAnswer.image,
                  optionId: userAnswer.option_id,
                  isCorrect: userAnswer.is_correct,
                }
              : null,
          };
        }) || [],
    };

    return data;
  }

  async findActivitySummaryFromAttempt(taskSlug: string, userId: string) {
    const attempt = await this.taskAttemptRepository.findOne({
      where: {
        student_id: userId,
        status: 'completed',
        task: { slug: taskSlug },
      },
      relations: {
        task: {
          taskQuestions: {
            taskQuestionOptions: true,
          },
        },
        taskAnswerLogs: {
          question: true,
        },
      },
      order: {
        completed_at: 'DESC',
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
    });

    if (!attempt) {
      console.log('No attempt found');

      throw new NotFoundException(
        `No attempt found for user ${userId} on task ${taskSlug}`,
      );
    }

    return this.mapActivitySummaryFromAttempt(attempt);
  }

  private mapActivitySummaryFromAttempt(
    attempt: TaskAttempt,
  ): ActivitySummaryResponseDto {
    const { title, image, description } = attempt.task;
    const { points, xp_gained, completed_at, task, taskAnswerLogs } = attempt;

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
              }
            : null,
        };
      }) || [];

    return {
      title,
      image,
      description,
      point: points,
      xpGained: xp_gained,
      completedAt: getDateTime(completed_at),
      questions,
    };
  }
}
