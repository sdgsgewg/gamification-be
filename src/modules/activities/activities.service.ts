import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FilterActivityDto } from './dto/requests/filter-activity.dto';
import { Task } from '../tasks/entities/task.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { ActivityOverviewResponseDto } from './dto/responses/activity-overview-response.dto';
import {
  ActivityAttempt,
  ActivityDetailResponseDto,
} from './dto/responses/activity-detail-response.dto';
import {
  getDateTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import { ActivityWithQuestionsResponseDto } from './dto/responses/activity-with-questions-response.dto';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { ActivitySummaryResponseDto } from './dto/responses/activity-summary-response.dto';
import { ActivityAttemptStatus } from './enums/activity-attempt-status.enum';

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
    const favSubject = await this.getUserMostAttemptedSubject(userId);

    if (favSubject)
      qb.andWhere('subject.name = :subjectName', { subjectName: favSubject });

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
  private async getUserMostAttemptedSubject(userId: string) {
    const res = await this.taskAttemptRepository
      .createQueryBuilder('ta')
      .leftJoin('ta.task', 'task')
      .leftJoin('task.subject', 'subject')
      .select('subject.name', 'subjectName')
      .addSelect('COUNT(*)', 'attemptCount')
      .where('ta.student_id = :userId', { userId })
      .groupBy('subject.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(1)
      .getRawOne();

    return res?.subjectName ?? null;
  }

  // ==========================
  // 🔍 DETAIL FETCH
  // ==========================
  async findActivityBySlug(slug: string, userId?: string) {
    // === CASE: Ada userId → ambil dari task_attempts langsung ===
    if (userId) {
      const attempt = await this.taskAttemptRepository.findOne({
        where: {
          student_id: userId,
          task: { slug },
        },
        relations: {
          task: {
            subject: true,
            material: true,
            taskType: true,
            taskGrades: { grade: true },
            taskQuestions: true,
          },
        },
        order: { last_accessed_at: 'DESC' },
      });

      if (!attempt || !attempt.task)
        throw new NotFoundException(`Activity with slug ${slug} not found`);

      const {
        answered_question_count,
        started_at,
        last_accessed_at,
        status,
        task,
      } = attempt;

      const rawStatus = status as string | null;

      const normalizedStatus = Object.values(ActivityAttemptStatus).includes(
        rawStatus as ActivityAttemptStatus,
      )
        ? (rawStatus as ActivityAttemptStatus)
        : ActivityAttemptStatus.NOT_STARTED;

      const meta = {
        answeredCount: answered_question_count ?? 0,
        startedAt: getDateTime(started_at) ?? null,
        lastAccessedAt: getDateTime(last_accessed_at) ?? null,
        status: normalizedStatus,
      };

      return this.mapActivityBySlugResponse(task, meta);
    }

    // Kalau user belum login → ambil dari task saja (tanpa attempt)
    // const qb = this.taskRepository
    //   .createQueryBuilder('task')
    //   .leftJoinAndSelect('task.subject', 'subject')
    //   .leftJoinAndSelect('task.material', 'material')
    //   .leftJoinAndSelect('task.taskType', 'taskType')
    //   .leftJoinAndSelect('task.taskGrades', 'taskGrade')
    //   .leftJoinAndSelect('taskGrade.grade', 'grade')
    //   .leftJoinAndSelect('task.taskQuestions', 'taskQuestion')
    //   .where('task.slug = :slug', { slug })
    //   .orderBy('taskQuestion.order', 'ASC');

    // const task = await qb.getOne();

    // === CASE: Tidak ada userId → ambil langsung dari tasks ===
    const task = await this.taskRepository.findOne({
      where: { slug },
      relations: {
        subject: true,
        material: true,
        taskType: true,
        taskGrades: { grade: true },
        taskQuestions: true,
      },
      order: {
        taskQuestions: {
          order: 'ASC',
        },
      },
    });

    if (!task)
      throw new NotFoundException(`Activity with slug ${slug} not found`);

    const meta = {
      answeredCount: 0,
      startedAt: null,
      lastAccessedAt: null,
      status: ActivityAttemptStatus.NOT_STARTED,
    };

    return this.mapActivityBySlugResponse(task, meta);
  }

  private mapActivityBySlugResponse(
    task: Task,
    meta: ActivityAttempt,
  ): ActivityDetailResponseDto {
    return {
      id: task.task_id,
      title: task.title,
      slug: task.slug,
      description: task.description ?? null,
      image: task.image ?? null,
      subject: task.subject
        ? { subjectId: task.subject.subject_id, name: task.subject.name }
        : null,
      material: task.material
        ? { materialId: task.material.material_id, name: task.material.name }
        : null,
      type: task.taskType
        ? { taskTypeId: task.taskType.task_type_id, name: task.taskType.name }
        : null,
      grade:
        task.taskGrades?.length > 0
          ? task.taskGrades
              .map((tg) => tg.grade?.name.replace('Kelas ', ''))
              .join(', ')
          : null,
      questionCount: task.taskQuestions?.length || 0,
      startTime: task.start_time ?? null,
      endTime: task.end_time ?? null,
      duration: getTimePeriod(task.start_time, task.end_time),
      createdBy: task.created_by || 'Unknown',
      attempt: {
        answeredCount: Number(meta.answeredCount) || 0,
        startedAt: meta.startedAt,
        lastAccessedAt: meta.lastAccessedAt,
        status: meta.status,
      },
    };
  }

  // async findActivityWithQuestions(slug: string, userId: string) {
  //   const qb = this.taskRepository
  //     .createQueryBuilder('task')
  //     .leftJoinAndSelect('task.taskQuestions', 'taskQuestion')
  //     .leftJoinAndSelect(
  //       'taskQuestion.taskQuestionOptions',
  //       'taskQuestionOption',
  //     )
  //     .where('task.slug = :slug', { slug })
  //     .orderBy('taskQuestion.order', 'ASC')
  //     .addOrderBy('taskQuestionOption.order', 'ASC');

  //   let attemptAnswerLogs: TaskAnswerLog[] = [];
  //   let lastAttemptId: string | null = null;

  //   if (userId) {
  //     const attemptSub = this.buildUserAttemptSubQuery(userId);
  //     qb.leftJoin(
  //       `(${attemptSub.getQuery()})`,
  //       'attempt',
  //       'attempt.task_id = task.task_id',
  //     )
  //       .setParameters(attemptSub.getParameters())
  //       .addSelect(['attempt.task_attempt_id AS task_attempt_id']);

  //     // Ambil jawaban user berdasarkan attempt
  //     const attemptMeta = await attemptSub.getRawOne();
  //     if (attemptMeta?.task_attempt_id) {
  //       lastAttemptId = attemptMeta.task_attempt_id;

  //       attemptAnswerLogs = await this.taskAnswerLogRepository.find({
  //         where: { task_attempt_id: lastAttemptId },
  //         relations: ['question', 'option'],
  //       });
  //     }
  //   } else {
  //     qb.addSelect(['NULL AS task_attempt_id']);
  //   }

  //   const { entities, raw } = await qb.getRawAndEntities();
  //   const task = entities[0];
  //   const meta = raw[0]; // ambil meta data tambahan (alias)

  //   if (!task)
  //     throw new NotFoundException(`Activity with slug ${slug} not found`);

  //   return this.mapActivityWithQuestionsResponse(
  //     task,
  //     meta.task_attempt_id,
  //     attemptAnswerLogs,
  //   );
  // }

  async findActivityWithQuestions(slug: string, userId?: string) {
    // === CASE: Ada userId → ambil dari task_attempts langsung ===
    if (userId) {
      const attempt = await this.taskAttemptRepository.findOne({
        where: {
          student_id: userId,
          task: { slug },
        },
        relations: {
          task: {
            taskQuestions: {
              taskQuestionOptions: true,
            },
          },
        },
        order: { last_accessed_at: 'DESC' },
      });

      if (!attempt || !attempt.task)
        throw new NotFoundException(`Activity with slug ${slug} not found`);

      const task = attempt.task;

      // Ambil semua jawaban user untuk attempt ini
      const attemptAnswerLogs = await this.taskAnswerLogRepository.find({
        where: { task_attempt_id: attempt.task_attempt_id },
        relations: ['question', 'option'],
      });

      const meta = {
        task_attempt_id: attempt.task_attempt_id,
      };

      return this.mapActivityWithQuestionsResponse(
        task,
        meta.task_attempt_id,
        attemptAnswerLogs,
      );
    }

    // === CASE: Tidak ada userId → ambil langsung dari tasks ===
    const task = await this.taskRepository.findOne({
      where: { slug },
      relations: {
        taskQuestions: {
          taskQuestionOptions: true,
        },
      },
      order: {
        taskQuestions: {
          order: 'ASC',
          taskQuestionOptions: {
            order: 'ASC',
          },
        },
      },
    });

    if (!task)
      throw new NotFoundException(`Activity with slug ${slug} not found`);

    // Jika user tidak login, tidak ada attempt atau answer logs
    return this.mapActivityWithQuestionsResponse(task, null, []);
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
            timeLimit: q.time_limit ?? null,
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
    const qb = this.taskAttemptRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.task', 'task')
      .leftJoinAndSelect('task.taskQuestions', 'question')
      .leftJoinAndSelect('question.taskQuestionOptions', 'option')
      .leftJoinAndSelect('attempt.taskAnswerLogs', 'answerLog')
      .leftJoinAndSelect('answerLog.question', 'answeredQuestion')
      .where('task.slug = :slug', { slug: taskSlug })
      .andWhere('attempt.student_id = :userId', { userId })
      .andWhere('attempt.status != :completed', { completed: 'completed' })
      .orderBy('question.order', 'ASC')
      .addOrderBy('option.order', 'ASC')
      .addOrderBy('answerLog.created_at', 'ASC');

    // Ambil satu attempt paling baru
    const attempt = await qb.getOne();

    if (!attempt)
      throw new NotFoundException(
        `No attempt found for user ${userId} on task ${taskSlug}`,
      );

    return this.mapActivitySummaryFromAttempt(attempt);
  }

  private mapActivitySummaryFromAttempt(
    attempt: TaskAttempt,
  ): ActivitySummaryResponseDto {
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
      point: points,
      xpGained: xp_gained,
      completedTime: getDateTime(completed_at),
      questions,
    };
  }
}
