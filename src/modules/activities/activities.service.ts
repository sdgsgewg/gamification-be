import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository, SelectQueryBuilder } from 'typeorm';
import { FilterActivityDto } from './dto/requests/filter-activity.dto';
import { Task } from '../tasks/entities/task.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { ActivityOverviewResponseDto } from './dto/responses/activity-overview-response.dto';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { TaskTypeScope } from '../task-types/enums/task-type-scope.enum';
import { TaskAttemptStatus } from '../task-attempts/enums/task-attempt-status.enum';
import { RecentAttemptResponseDto } from '../task-attempts/dto/responses/recent-attempt-response.dto';
import { CurrentAttemptResponseDto } from '../task-attempts/dto/responses/current-attempt-response.dto';
import { TaskAttemptService } from '../task-attempts/task-attempts.service';
import { TaskResponseMapper } from '../tasks/mappers/task-response.mapper';
import { TaskAttemptResponseMapper } from '../task-attempts/mapper/task-attempt-response.mapper';
import { TaskStatus } from '../tasks/enums/task-status.enum';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
    @InjectRepository(TaskAnswerLog)
    private readonly taskAnswerLogRepository: Repository<TaskAnswerLog>,
    private readonly taskAttemptService: TaskAttemptService,
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
      .andWhere('task.status = :status', { status: TaskStatus.FINALIZED })
      .andWhere('task.status = :status', { status: TaskStatus.PUBLISHED })
      // .andWhere('task.start_time <= :now', { now })
      // .andWhere('task.end_time >= :now', { now })
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
      sub.andWhere('ta.status != :completed', {
        completed: TaskAttemptStatus.COMPLETED,
      });

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
      .andWhere('ta.status = :status', { status: TaskAttemptStatus.COMPLETED })
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
    // Ambil task
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

    if (!task) {
      throw new NotFoundException(`Activity with slug ${slug} not found`);
    }

    // Default metadata
    let currAttemptMeta: CurrentAttemptResponseDto = {
      answeredCount: 0,
      startedAt: null,
      lastAccessedAt: null,
      status: TaskAttemptStatus.NOT_STARTED,
    };

    let recentAttemptsMeta: RecentAttemptResponseDto[] = [];

    // Kalau userId ada -> cari attempt user
    if (userId) {
      const attemptMeta = await this.taskAttemptService.getAttemptMeta({
        userId,
        taskId: task.task_id,
        classId: null,
      });

      currAttemptMeta = attemptMeta.current;
      recentAttemptsMeta = attemptMeta.recent;
    }

    // Mapping ke DTO final
    return TaskResponseMapper.mapActivityDetail(
      task,
      currAttemptMeta,
      recentAttemptsMeta,
    );
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

    return TaskResponseMapper.mapActivityWithQuestionsResponse(
      task,
      lastAttemptId,
      attemptAnswerLogs,
    );
  }

  async findActivitySummaryFromAttempt(attemptId: string) {
    const attempt = await this.taskAttemptRepository.findOne({
      where: {
        task_attempt_id: attemptId,
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
      throw new NotFoundException(`No attempt found with id ${attemptId}`);
    }

    return TaskAttemptResponseMapper.mapActivitySummaryFromAttempt(attempt);
  }
}
