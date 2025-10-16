import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FilterActivityDto } from './dto/requests/filter-activity.dto';
import { Task } from '../tasks/entities/task.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { ActivityOverviewResponseDto } from './dto/responses/activity-overview-response.dto';
import { ActivityDetailResponseDto } from './dto/responses/activity-detail-response.dto';
import {
  getDateTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
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
      taskGrade: t.taskgrade ?? (t.taskGrade || null),
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
      .select('ta.task_id', 'task_id')
      .addSelect('MAX(ta.answered_question_count)', 'answeredcount')
      .addSelect('MAX(ta.last_accessed_at)', 'lastaccessedat')
      .addSelect('MAX(ta.completed_at)', 'completedat')
      .addSelect('MAX(ta.status)', 'status')
      .addSelect('MAX(ta.started_at)', 'laststarted')
      .where('ta.student_id = :userId', { userId });

    if (!includeCompleted)
      sub.andWhere('ta.status != :completed', { completed: 'completed' });

    return sub.groupBy('ta.task_id');
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
      .addSelect('MAX(attemptcont.laststarted)', 'laststarted')
      .orderBy('MAX(attemptcont.laststarted)', 'DESC');
  }

  private async applyRecommendedSection(
    qb: SelectQueryBuilder<Task>,
    userId: string,
  ) {
    const favSubject = await this.getUserMostAttemptedSubject(userId);
    if (favSubject)
      qb.andWhere('subject.name = :subjectName', { subjectName: favSubject });
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
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.subject', 'subject')
      .leftJoinAndSelect('task.material', 'material')
      .leftJoinAndSelect('task.taskType', 'taskType')
      .leftJoinAndSelect('task.taskGrades', 'taskGrade')
      .leftJoinAndSelect('taskGrade.grade', 'grade')
      .leftJoinAndSelect('task.taskQuestions', 'taskQuestion')
      .leftJoinAndSelect(
        'taskQuestion.taskQuestionOptions',
        'taskQuestionOption',
      )
      .where('task.slug = :slug', { slug })
      .orderBy('taskQuestion.order', 'ASC')
      .addOrderBy('taskQuestionOption.order', 'ASC');

    if (userId) {
      const attemptSub = this.buildUserAttemptSubQuery(userId);
      qb.leftJoin(
        `(${attemptSub.getQuery()})`,
        'attempt',
        'attempt.task_id = task.task_id',
      )
        .setParameters(attemptSub.getParameters())
        .addSelect([
          'attempt.answeredcount AS answeredcount',
          'attempt.lastaccessedat AS lastaccessedat',
          'attempt.completedat AS completedat',
          'attempt.status AS status',
        ]);
    } else {
      qb.addSelect([
        '0 AS answeredcount',
        'NULL AS lastaccessedat',
        'NULL AS completedat',
        `'not_started' AS status`,
      ]);
    }

    const { entities, raw } = await qb.getRawAndEntities();
    const task = entities[0];
    const meta = raw[0]; // <— alias tambahan dari subquery

    if (!task)
      throw new NotFoundException(`Activity with slug ${slug} not found`);

    return this.mapToDetailResponse(task, {
      answeredCount: meta.answeredcount ?? 0,
      lastAccessedAt: meta.lastaccessedat ?? null,
      completedAt: meta.completedat ?? null,
      status: meta.status ?? 'not_started',
    });
  }

  private mapToDetailResponse(task: any, meta: any): ActivityDetailResponseDto {
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
      answeredCount: Number(meta.answeredCount) || 0,
      startTime: task.start_time ?? null,
      endTime: task.end_time ?? null,
      duration: getTimePeriod(task.start_time, task.end_time),
      createdBy: task.created_by || 'Unknown',
      lastAccessedTime: meta.lastAccessedAt
        ? getDateTime(meta.lastAccessedAt)
        : null,
      completedTime: meta.completedAt ? getDateTime(meta.completedAt) : null,
      status: meta.status || 'not_started',
    };
  }
}
