import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { Class } from '../classes/entities/class.entity';
import { FilterClassTaskDto } from './dto/requests/filter-class-task.dto';
import { StudentClassTaskResponseDto } from './dto/responses/student-class-task-response.dto';
import {
  getDate,
  getDateTime,
  getTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import {
  ClassTaskDetailResponseDto,
  TaskDetail,
  TaskDuration,
} from './dto/responses/class-task-detail-response.dto';
import { ClassTaskWithQuestionsResponseDto } from './dto/responses/class-task-with-questions-response.dto';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import {
  TaskAttemptStatus,
  TaskAttemptStatusLabels,
} from '../task-attempts/enums/task-attempt-status.enum';
import { Task } from '../tasks/entities/task.entity';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import {
  ClassTaskAttemptProgress,
  ClassTaskGradingProgress,
  ClassTaskStats,
  ClassTaskSummaryResponseDto,
} from './dto/responses/class-task-summary-response.dto';
import { TaskDifficultyLabels } from '../tasks/enums/task-difficulty.enum';
import { TeacherClassTaskResponseDto } from './dto/responses/teacher-class-task-response.dto';
import { ShareTaskIntoClassesDto } from './dto/requests/share-task-into-classes-request.dto';
import { AvailableClassesResponseDto } from './dto/responses/available-classes-reponse.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { FilterClassDto } from '../classes/dto/requests/filter-class.dto';
import { FilterTaskAttemptDto } from '../task-attempts/dto/requests/filter-task-attempt.dto';
import { GroupedTaskAttemptResponseDto } from '../task-attempts/dto/responses/grouped-task-attempt.dto';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { TaskAttemptOverviewResponseDto } from '../task-attempts/dto/responses/task-attempt-overview.dto';
import { QuestionResponseDto } from '../task-questions/dto/responses/question-response.dto';
import { QuestionOptionResponseDto } from '../task-question-options/dto/responses/question-option-response.dto';
import { AnswerLogResponseDto } from '../task-answer-logs/dto/responses/answer-log-response.dto';
import { RecentAttemptResponseDto } from '../task-attempts/dto/responses/recent-attempt-response.dto';
import { CurrentAttemptResponseDto } from '../task-attempts/dto/responses/current-attempt-response.dto';
import { ActivityLogService } from '../activty-logs/activity-logs.service';
import { ActivityLogEventType } from '../activty-logs/enums/activity-log-event-type';
import { getActivityLogDescription } from 'src/common/utils/get-activity-log-description.util';
import { UserRole } from '../roles/enums/user-role.enum';
import {
  ClassResponse,
  ClassTaskOverviewResponseDto,
} from './dto/responses/class-task-overview-response.dto';

@Injectable()
export class ClassTaskService {
  constructor(
    @InjectRepository(ClassTask)
    private readonly classTaskRepository: Repository<ClassTask>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
    @InjectRepository(TaskAnswerLog)
    private readonly taskAnswerLogRepository: Repository<TaskAnswerLog>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Find tasks from all classes (grouped by date)
   */
  async findTasksFromAllClasses(
    userId: string,
    filterDto: FilterTaskAttemptDto,
  ): Promise<GroupedTaskAttemptResponseDto[]> {
    // Ambil semua class task dengan relasi task dan class
    const classTasks = await this.classTaskRepository.find({
      relations: {
        task: true,
        class: true,
      },
      order: {
        end_time: 'DESC',
      },
    });

    if (!classTasks.length) {
      throw new NotFoundException(`No class tasks found`);
    }

    // Ambil semua task attempt user untuk sinkronisasi progress
    const attempts = await this.taskAttemptRepository.find({
      where: { student_id: userId },
      relations: { task: true, class: true },
    });

    // Gabungkan: setiap class task → cari task attempt-nya
    const combined = classTasks.map((ct) => {
      const matchingAttempt = attempts.find(
        (a) => a.task_id === ct.task_id && a.class_id === ct.class_id,
      );

      return {
        classTask: ct,
        attempt: matchingAttempt ?? null,
      };
    });

    // Apply filter status kalau ada
    let filtered = combined;
    if (filterDto.status) {
      filtered = combined.filter((item) =>
        item.attempt
          ? item.attempt.status === filterDto.status
          : filterDto.status === TaskAttemptStatus.NOT_STARTED,
      );
    }

    // Mapping ke grouped DTO
    const grouped = filtered.reduce(
      (acc, { classTask, attempt }) => {
        const task = classTask.task;
        const classEntity = classTask.class;

        const dateValue =
          attempt?.last_accessed_at || attempt?.completed_at || null;
        const dateKey = dateValue
          ? format(new Date(dateValue), 'yyyy-MM-dd')
          : 'no-date';

        if (!acc[dateKey]) {
          if (dateValue) {
            const date = new Date(dateValue);
            acc[dateKey] = {
              dateLabel: format(date, 'd MMM yyyy', { locale: id }),
              dayLabel: format(date, 'EEEE', { locale: id }),
              attempts: [],
            };
          } else {
            acc[dateKey] = {
              dateLabel: 'Belum Dikerjakan',
              dayLabel: '',
              attempts: [],
            };
          }
        }

        const taskDto: TaskAttemptOverviewResponseDto = {
          id: attempt?.task_attempt_id ?? null,
          title: task.title,
          image: task.image || null,
          status: attempt?.status ?? TaskAttemptStatus.NOT_STARTED,
          classSlug: classEntity.slug,
          taskSlug: task.slug,
          deadline: getDate(classTask.end_time),
          lastAccessedTime: attempt?.last_accessed_at
            ? getTime(attempt.last_accessed_at)
            : null,
          completedTime: attempt?.completed_at
            ? getTime(attempt.completed_at)
            : null,
        };

        acc[dateKey].attempts.push(taskDto);
        return acc;
      },
      {} as Record<string, GroupedTaskAttemptResponseDto>,
    );

    return Object.values(grouped);
  }

  /**
   * Find tasks from all classes
   */
  async findTasksFromAllClassesList(
    userId: string,
    filterDto: FilterTaskAttemptDto,
  ): Promise<ClassTaskOverviewResponseDto[]> {
    // Ambil semua class task dengan relasi task dan class
    const classTasks = await this.classTaskRepository.find({
      relations: {
        task: true,
        class: true,
      },
      order: {
        end_time: 'DESC',
      },
    });

    if (!classTasks.length) {
      throw new NotFoundException(`No class tasks found`);
    }

    // Ambil semua task attempt user
    const attempts = await this.taskAttemptRepository.find({
      where: { student_id: userId },
      relations: { student: true, task: true, class: true },
    });

    // Gabungkan classTask + attempt
    const combined = classTasks
      .map((ct) => ({
        classTask: ct,
        attempt: attempts.find(
          (a) => a.task_id === ct.task_id && a.class_id === ct.class_id,
        ),
      }))
      .filter((item) => item.attempt);

    // Filter status jika ada
    let filtered = combined;
    if (filterDto.status) {
      filtered = filtered.filter((item) =>
        item.attempt
          ? item.attempt.status === filterDto.status
          : filterDto.status === TaskAttemptStatus.NOT_STARTED,
      );
    }

    // Mapping ke flat DTO
    const result: ClassTaskOverviewResponseDto[] = filtered.map(
      ({ classTask, attempt }) => {
        const task = classTask.task;
        const classEntity = classTask.class;

        const classData: ClassResponse = {
          id: classEntity.class_id,
          name: classEntity.name,
          slug: classEntity.slug,
        };

        return {
          id: attempt?.task_attempt_id ?? null,
          title: task.title,
          image: task.image || null,
          status: attempt?.status ?? TaskAttemptStatus.NOT_STARTED,
          class: classData,
          taskSlug: task.slug,
          deadline: getDate(classTask.end_time),
        };
      },
    );

    return result;
  }

  /**
   * Find available tasks for student in a class
   */
  async findStudentClassTasks(
    classSlug: string,
    userId: string,
    filterDto: FilterClassTaskDto,
  ): Promise<StudentClassTaskResponseDto[]> {
    // Ambil class
    const classData = await this.classRepository.findOne({
      where: { slug: classSlug },
    });

    if (!classData) {
      throw new NotFoundException(`Class with slug ${classSlug} not found`);
    }

    // Ambil semua class_tasks untuk class tersebut
    const classTasks = await this.classTaskRepository
      .createQueryBuilder('ct')
      .leftJoinAndSelect('ct.task', 'task')
      .leftJoinAndSelect('task.taskType', 'taskType')
      .leftJoinAndSelect('task.subject', 'subject')
      .leftJoinAndSelect('task.taskQuestions', 'taskQuestions')
      .where('ct.class_id = :classId', { classId: classData.class_id })
      .orderBy('task.created_at', 'DESC')
      .getMany();

    if (!classTasks.length) return [];

    // Ambil semua attempts siswa untuk task di kelas ini
    const taskIds = classTasks.map((ct) => ct.task_id);
    const attempts = await this.taskAttemptRepository.find({
      where: { task_id: In(taskIds), student_id: userId },
    });

    // Mapping task_id -> latest attempt (by completed_at)
    const attemptsMap = new Map<string, TaskAttempt>();
    for (const a of attempts) {
      const existing = attemptsMap.get(a.task_id);
      if (
        !existing ||
        (a.completed_at &&
          (!existing.completed_at || a.completed_at > existing.completed_at))
      ) {
        attemptsMap.set(a.task_id, a);
      }
    }

    // Mapping ke DTO
    const tasksDto: StudentClassTaskResponseDto[] = classTasks.map((ct) => {
      const attempt = attemptsMap.get(ct.task_id);

      return {
        title: ct.task.title,
        slug: ct.task.slug,
        image: ct.task.image && ct.task.image !== '' ? ct.task.image : null,
        type: ct.task.taskType?.name ?? '-',
        subject: ct.task.subject?.name ?? '-',
        questionCount: ct.task.taskQuestions?.length ?? 0,
        answeredCount: attempt?.answered_question_count ?? 0,
        deadline: ct.end_time ? getDateTime(ct.end_time) : null,
        status: attempt?.status ?? TaskAttemptStatus.NOT_STARTED,
      };
    });

    return tasksDto;
  }

  /**
   * Find available tasks for teacher in a class
   */
  async findTeacherClassTasks(
    classSlug: string,
    filterDto: FilterClassTaskDto,
  ): Promise<TeacherClassTaskResponseDto[]> {
    // Ambil class berdasarkan slug
    const qb = this.classRepository
      .createQueryBuilder('class')
      .where('class.slug = :slug', { slug: classSlug });

    const classData = await qb.getOne();

    if (!classData) {
      throw new NotFoundException(`Class with slug ${classSlug} not found`);
    }

    const { class_id } = classData;

    // Ambil task untuk class tersebut
    const classTasks = await this.classTaskRepository.find({
      where: { class: { class_id } },
      relations: {
        class: {
          classStudents: true,
        },
        task: {
          taskType: true,
          subject: true,
          taskQuestions: true,
        },
      },
      order: {
        task: {
          created_at: 'DESC',
          taskQuestions: {
            order: 'ASC',
          },
        },
      },
    });

    // Ambil jumlah submission per task dalam satu class
    const submissionStats = await this.classTaskRepository.manager
      .createQueryBuilder()
      .select('ct.task_id', 'taskId')
      .addSelect('COUNT(ts.task_submission_id)', 'submissionCount')
      .addSelect(
        'COUNT(CASE WHEN ts.finish_graded_at IS NOT NULL THEN 1 END)',
        'gradedCount',
      )
      .from('class_tasks', 'ct')
      .innerJoin('task_attempts', 'ta', 'ta.task_id = ct.task_id')
      .innerJoin(
        'task_submissions',
        'ts',
        'ts.task_attempt_id = ta.task_attempt_id',
      )
      .where('ct.class_id = :classId', { classId: class_id })
      .groupBy('ct.task_id')
      .getRawMany();

    // Buat map untuk akses cepat
    const submissionMap = Object.fromEntries(
      submissionStats.map((row) => [
        row.taskId,
        {
          submissionCount: Number(row.submissionCount),
          gradedCount: Number(row.gradedCount),
        },
      ]),
    );

    // Mapping ke DTO
    const tasks: TeacherClassTaskResponseDto[] = classTasks.map((ct) => {
      const stat = submissionMap[ct.task.task_id] ?? {
        submissionCount: 0,
        gradedCount: 0,
      };

      return {
        title: ct.task.title,
        slug: ct.task.slug,
        image: ct.task.image != '' ? ct.task.image : null,
        type: ct.task.taskType?.name ?? '-',
        subject: ct.task.subject?.name ?? '-',
        questionCount: Number(ct.task.taskQuestions?.length) ?? 0,
        totalStudents: ct.class.classStudents.length,
        submissionCount: stat.submissionCount,
        gradedCount: stat.gradedCount,
        deadline: getDateTime(ct.end_time) ?? null,
      };
    });

    return tasks;
  }

  /**
   * Find class task by slug and include other important data
   */
  async findClassTaskBySlug(
    classSlug: string,
    taskSlug: string,
    userId?: string,
  ): Promise<ClassTaskDetailResponseDto> {
    // Cari class berdasarkan slug
    const classEntity = await this.classRepository.findOne({
      where: { slug: classSlug },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with slug ${classSlug} not found`);
    }

    // Cari ClassTask berdasarkan class dan slug task
    const classTask = await this.classTaskRepository.findOne({
      where: {
        class_id: classEntity.class_id,
        task: { slug: taskSlug },
      },
      relations: {
        class: { teacher: true },
        task: {
          subject: true,
          material: true,
          taskType: true,
          taskGrades: { grade: true },
          taskQuestions: true,
        },
      },
    });

    if (!classTask)
      throw new NotFoundException(
        `Task with slug ${taskSlug} not found in this class`,
      );

    const task = classTask.task;

    // Default metadata
    let currAttemptMeta: CurrentAttemptResponseDto = {
      answeredCount: 0,
      startedAt: null,
      lastAccessedAt: null,
      status: TaskAttemptStatus.NOT_STARTED,
    };

    let recentAttemptsMeta: RecentAttemptResponseDto[] = [];

    // Jika userId ada → ambil attempt
    if (userId) {
      // Attempt terkini (on progress)
      const currAttempt = await this.taskAttemptRepository.findOne({
        where: {
          student_id: userId,
          task_id: task.task_id,
          class_id: classEntity.class_id,
          status: TaskAttemptStatus.ON_PROGRESS,
        },
        order: { last_accessed_at: 'DESC' },
      });

      if (currAttempt) {
        currAttemptMeta = {
          answeredCount: currAttempt.answered_question_count ?? 0,
          startedAt: getDateTime(currAttempt.started_at),
          lastAccessedAt: getDateTime(currAttempt.last_accessed_at),
          status: currAttempt.status as TaskAttemptStatus,
        };
      }

      // Attempt terakhir yang sudah selesai
      const recentAttempts = await this.taskAttemptRepository.find({
        where: {
          student_id: userId,
          task_id: task.task_id,
          class_id: classEntity.class_id,
          status: In([
            TaskAttemptStatus.PAST_DUE,
            TaskAttemptStatus.SUBMITTED,
            TaskAttemptStatus.COMPLETED,
          ]),
        },
        relations: {
          taskSubmission: true,
        },
      });

      recentAttemptsMeta = recentAttempts.map((a) => ({
        id: a.task_attempt_id,
        startedAt: getDateTime(a.started_at) ?? '-',
        submittedAt: a.taskSubmission
          ? getDateTime(a.taskSubmission.created_at)
          : '-',
        completedAt: a.completed_at ? getDateTime(a.completed_at) : '-',
        duration: a.taskSubmission
          ? getTimePeriod(a.started_at, a.taskSubmission.created_at)
          : '-',
        status:
          (a.status as TaskAttemptStatus) ?? TaskAttemptStatus.NOT_STARTED,
      }));
    }

    // Mapping ke DTO final
    return this.mapClassTaskDetailResponse(
      classTask,
      currAttemptMeta,
      recentAttemptsMeta,
    );
  }

  private mapClassTaskDetailResponse(
    classTask: ClassTask,
    currAttemptMeta: CurrentAttemptResponseDto,
    recentAttemptsMeta: RecentAttemptResponseDto[],
  ): ClassTaskDetailResponseDto {
    const task = classTask.task;
    const {
      task_id,
      title,
      slug,
      image,
      description,
      subject,
      material,
      taskType,
      taskGrades,
      difficulty,
      taskQuestions,
      created_by,
    } = task;

    const taskDetail: TaskDetail = {
      title,
      subtitle: `From class '${classTask.class.name}'`,
      slug,
      description: description ?? null,
      image: image ?? null,
      subject: subject ? { id: subject.subject_id, name: subject.name } : null,
      material: material
        ? { id: material.material_id, name: material.name }
        : null,
      grade:
        taskGrades?.length > 0
          ? taskGrades
              .map((g) => g.grade?.name?.replace('Kelas ', ''))
              .join(', ')
          : null,
      difficulty: TaskDifficultyLabels[difficulty] ?? 'Unknown',
      questionCount: taskQuestions?.length || 0,
      createdBy: created_by ?? 'Unknown',
      type: {
        id: taskType.task_type_id,
        name: taskType.name,
        isRepeatable: taskType.is_repeatable,
      },
    };

    const currAttempt: CurrentAttemptResponseDto | null =
      currAttemptMeta?.status === TaskAttemptStatus.ON_PROGRESS
        ? currAttemptMeta
        : null;

    const { start_time, end_time } = classTask;

    const duration: TaskDuration = {
      startTime: start_time ?? null,
      endTime: end_time ?? null,
      duration: getTimePeriod(start_time, end_time),
    };

    // ===========================
    //  BUILD RESPONSE
    // ===========================
    return {
      id: task_id,
      taskDetail,
      duration,
      currAttempt: currAttempt ?? null,
      recentAttempts: recentAttemptsMeta.length > 0 ? recentAttemptsMeta : [],
    };
  }

  /**
   * Find class task by slug and include all questions (and user's latest attempt if any)
   */
  async findClassTaskWithQuestions(
    classSlug: string,
    taskSlug: string,
    userId?: string,
  ): Promise<ClassTaskWithQuestionsResponseDto> {
    // 1️⃣ Cari class berdasarkan slug
    const classData = await this.classRepository.findOne({
      where: { slug: classSlug },
    });

    if (!classData) {
      throw new NotFoundException(`Class with slug ${classSlug} not found`);
    }

    // 2️⃣ Cari ClassTask yang sesuai
    const classTask = await this.classTaskRepository.findOne({
      where: {
        class: { slug: classSlug },
        task: { slug: taskSlug },
      },
      relations: {
        task: {
          taskQuestions: { taskQuestionOptions: true },
        },
      },
      order: {
        task: {
          taskQuestions: {
            order: 'ASC',
            taskQuestionOptions: { order: 'ASC' },
          },
        },
      },
    });

    if (!classTask) {
      throw new NotFoundException(
        `Task with slug ${taskSlug} not found in class ${classSlug}`,
      );
    }

    const { task } = classTask;

    // Default values
    let lastAttemptId: string | null = null;
    let attemptAnswerLogs: TaskAnswerLog[] = [];

    // Jika user login → cari attempt dan jawaban user
    if (userId) {
      const latestAttempt = await this.taskAttemptRepository.findOne({
        where: {
          student_id: userId,
          task: { slug: taskSlug },
          class_id: classData.class_id,
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

    // 5️⃣ Kembalikan DTO yang sudah dipetakan
    return this.mapClassTaskWithQuestionsResponse(
      task,
      lastAttemptId,
      attemptAnswerLogs,
    );
  }

  private mapClassTaskWithQuestionsResponse(
    taskWithRelations: Task,
    lastAttemptId?: string | null,
    attemptAnswerLogs: TaskAnswerLog[] = [],
  ): ClassTaskWithQuestionsResponseDto {
    return {
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
              isSelected: userAnswer?.option_id === o.task_question_option_id,
            })),
            userAnswer: userAnswer
              ? {
                  answerLogId: userAnswer.task_answer_log_id,
                  text: userAnswer.answer_text ?? null,
                  image: userAnswer.image ?? null,
                  optionId: userAnswer.option_id ?? null,
                  isCorrect: userAnswer.is_correct ?? null,
                }
              : null,
          };
        }) || [],
    };
  }

  /**
   * Find class task by slug and include summary ()
   */
  async findClassTaskSummaryFromAttempt(
    attemptId: string,
  ): Promise<ClassTaskSummaryResponseDto> {
    const attempt = await this.taskAttemptRepository.findOne({
      where: {
        task_attempt_id: attemptId,
        status: In([TaskAttemptStatus.SUBMITTED, TaskAttemptStatus.COMPLETED]),
      },
      relations: {
        class: {
          teacher: true,
        },
        task: {
          taskQuestions: {
            taskQuestionOptions: true,
          },
        },
        taskSubmission: true,
        taskAnswerLogs: {
          // include question relation if your TaskAnswerLog has it (ref in example)
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
      throw new NotFoundException(
        `No completed attempt found for attempt with id ${attemptId}`,
      );
    }

    return this.mapClassTaskSummaryFromAttempt(attempt);
  }

  private mapClassTaskSummaryFromAttempt(
    attempt: TaskAttempt,
  ): ClassTaskSummaryResponseDto {
    const { title, image, description, taskQuestions } = attempt.task;
    const {
      points,
      xp_gained,
      started_at,
      status,
      task,
      taskAnswerLogs,
      taskSubmission,
    } = attempt;

    const totalPoints = taskQuestions.reduce((acc, q) => acc + q.point, 0);

    const score = Math.round((points / totalPoints) * 100);

    const stats: ClassTaskStats = {
      pointGained: points,
      totalPoints,
      score,
      xpGained: xp_gained,
    };

    const attemptProgress: ClassTaskAttemptProgress = {
      startedAt: getDateTime(started_at),
      submittedAt: getDateTime(taskSubmission.created_at),
      duration: getTimePeriod(started_at, taskSubmission.created_at),
      status: TaskAttemptStatusLabels[status],
    };

    const gradingProgress: ClassTaskGradingProgress = {
      startGradedAt: getDateTime(taskSubmission.start_graded_at),
      lastGradedAt: getDateTime(taskSubmission.last_graded_at),
      finishGradedAt: getDateTime(taskSubmission.finish_graded_at),
      duration: getTimePeriod(
        taskSubmission.start_graded_at,
        taskSubmission.finish_graded_at,
      ),
      status: TaskAttemptStatusLabels[taskSubmission.status],
    };

    const questions: QuestionResponseDto[] =
      task.taskQuestions?.map((q) => {
        const userAnswer = taskAnswerLogs?.find(
          (log) => log.question_id === q.task_question_id,
        );

        const options: QuestionOptionResponseDto[] =
          q.taskQuestionOptions?.map((o) => ({
            optionId: o.task_question_option_id,
            text: o.text,
            isCorrect: !!o.is_correct,
            isSelected: userAnswer?.option_id === o.task_question_option_id,
          })) || [];

        const answerLog: AnswerLogResponseDto | null = userAnswer
          ? {
              answerLogId: userAnswer.task_answer_log_id ?? null,
              text: userAnswer.answer_text ?? null,
              image: userAnswer.image ?? null,
              optionId: userAnswer.option_id ?? null,
              isCorrect:
                typeof userAnswer.is_correct === 'boolean'
                  ? userAnswer.is_correct
                  : null,
              pointAwarded: userAnswer.point_awarded ?? null,
              teacherNotes: userAnswer.teacher_notes ?? null,
            }
          : null;

        return {
          questionId: q.task_question_id,
          text: q.text,
          point: q.point,
          type: q.type,
          timeLimit: q.time_limit ?? null,
          image: q.image ?? null,
          options,
          userAnswer: answerLog,
        };
      }) || [];

    return {
      title,
      image,
      description,
      teacherName: attempt.class.teacher?.name ?? 'Unknown',
      className: attempt.class.name,
      stats,
      attemptProgress,
      gradingProgress,
      questions,
    };
  }

  /**
   * Find classes that can be shared for this task
   */
  async findAvailableClasses(
    taskId: string,
    teacherId: string,
    filterDto: FilterClassDto,
  ): Promise<AvailableClassesResponseDto[]> {
    const { searchText } = filterDto;

    // Subquery: ambil semua class_id yang sudah punya task ini
    const subQuery = this.classTaskRepository
      .createQueryBuilder('ct')
      .select('ct.class_id')
      .where('ct.task_id = :taskId', { taskId });

    // Query utama: ambil class milik guru yang belum punya task ini
    const qb = this.classRepository
      .createQueryBuilder('c')
      .where('c.teacher_id = :teacherId', { teacherId })
      .andWhere(`c.class_id NOT IN (${subQuery.getQuery()})`)
      .setParameters(subQuery.getParameters());

    // Tambahkan filter pencarian
    if (searchText) {
      qb.andWhere(
        '(LOWER(c.name) LIKE LOWER(:searchText) OR LOWER(c.slug) LIKE LOWER(:searchText))',
        {
          searchText: `%${searchText}%`,
        },
      );
    }

    const classes = await qb.getMany();

    const response: AvailableClassesResponseDto[] = classes.map((cls) => ({
      id: cls.class_id,
      name: cls.name,
      slug: cls.slug,
    }));

    return response;
  }

  /**
   * Share tasks into multiple classes
   */
  async shareTaskIntoClasses(
    dto: ShareTaskIntoClassesDto,
    userId: string,
  ): Promise<BaseResponseDto> {
    const { taskId, classIds, startTime, endTime } = dto;

    if (!classIds?.length) {
      return {
        status: 400,
        isSuccess: false,
        message: 'No class IDs provided.',
      };
    }

    // Load task with needed fields
    const task = await this.taskRepository.findOne({
      where: { task_id: taskId },
    });

    if (!task) {
      return {
        status: 404,
        isSuccess: false,
        message: 'Task not found.',
      };
    }

    const finalStartTime = startTime ?? task.start_time ?? null;
    const finalEndTime = endTime ?? task.end_time ?? null;

    // Simpan class tasks
    const newClassTasks = classIds.map((classId) =>
      this.classTaskRepository.create({
        class_id: classId,
        task_id: taskId,
        start_time: finalStartTime,
        end_time: finalEndTime,
      }),
    );

    await this.classTaskRepository.save(newClassTasks);

    // Loop class satu per satu
    for (const classId of classIds) {
      const classEntity = await this.classRepository.findOne({
        where: { class_id: classId },
        relations: {
          classStudents: {
            student: true,
          },
        },
      });

      // Create activity log
      if (classEntity) {
        const description = getActivityLogDescription(
          ActivityLogEventType.SHARE_TASK,
          'class task',
          { task, class: classEntity },
          UserRole.TEACHER,
        );

        await this.activityLogService.createActivityLog({
          userId,
          eventType: ActivityLogEventType.SHARE_TASK,
          description,
          metadata: {
            task_id: task.task_id,
            class_id: classEntity.class_id,
          },
        });
      }

      // Create task attempts
      if (classEntity?.classStudents?.length) {
        const taskAttempts = classEntity.classStudents.map((cs) =>
          this.taskAttemptRepository.create({
            task_id: taskId,
            student_id: cs.student.user_id,
            class_id: classId,
            status: TaskAttemptStatus.NOT_STARTED,
          }),
        );

        await this.taskAttemptRepository.save(taskAttempts);
      }
    }

    // Update status task menjadi PUBLISHED
    if (!task.is_published || !task.published_at) {
      task.is_published = true;
      task.published_at = new Date();
      await this.taskRepository.save(task);
    }

    return {
      status: 200,
      isSuccess: true,
      message: 'Task has been shared into selected classes.',
    };
  }
}
