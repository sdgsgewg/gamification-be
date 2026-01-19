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
} from 'src/common/utils/date-modifier.util';
import { ClassTaskDetailResponseDto } from './dto/responses/class-task-detail-response.dto';
import { ClassTaskWithQuestionsResponseDto } from './dto/responses/class-task-with-questions-response.dto';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { TaskAttemptStatus } from '../task-attempts/enums/task-attempt-status.enum';
import { Task } from '../tasks/entities/task.entity';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import { ClassTaskSummaryResponseDto } from './dto/responses/class-task-summary-response.dto';
import { TeacherClassTaskResponseDto } from './dto/responses/teacher-class-task-response.dto';
import { ShareTaskIntoClassesDto } from './dto/requests/share-task-into-classes-request.dto';
import { AvailableClassesResponseDto } from './dto/responses/available-classes-reponse.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { FilterClassDto } from '../classes/dto/requests/filter-class.dto';
import { FilterTaskAttemptDto } from '../task-attempts/dto/requests/filter-task-attempt.dto';
import { GroupedTaskAttemptResponseDto } from '../task-attempts/dto/responses/grouped-task-attempt.dto';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ClassResponseDto,
  TaskAttemptOverviewResponseDto,
} from '../task-attempts/dto/responses/task-attempt-overview.dto';
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
import { TaskAttemptService } from '../task-attempts/task-attempts.service';
import { TaskResponseMapper } from '../tasks/mappers/task-response.mapper';
import { TaskAttemptResponseMapper } from '../task-attempts/mapper/task-attempt-response.mapper';

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
    private readonly taskAttemptService: TaskAttemptService,
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
              dateLabel: 'Not Started',
              dayLabel: '',
              attempts: [],
            };
          }
        }

        const classData: ClassResponseDto = {
          name: classEntity.name,
          slug: classEntity.slug,
        };

        const taskDto: TaskAttemptOverviewResponseDto = {
          id: attempt?.task_attempt_id ?? null,
          title: task.title,
          image: task.image || null,
          status: attempt?.status ?? TaskAttemptStatus.NOT_STARTED,
          class: classData,
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

    if (!classTask) {
      throw new NotFoundException(
        `Task with slug ${taskSlug} not found in this class`,
      );
    }

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
      const attemptMeta = await this.taskAttemptService.getAttemptMeta({
        userId,
        taskId: classTask.task.task_id,
        classId: classEntity.class_id,
      });

      currAttemptMeta = attemptMeta.current;
      recentAttemptsMeta = attemptMeta.recent;
    }

    return TaskResponseMapper.mapClassTaskDetail(
      classTask,
      currAttemptMeta,
      recentAttemptsMeta,
    );
  }

  /**
   * Find class task by slug and include all questions (and user's latest attempt if any)
   */
  async findClassTaskWithQuestions(
    classSlug: string,
    taskSlug: string,
    userId?: string,
  ): Promise<ClassTaskWithQuestionsResponseDto> {
    // Cari class berdasarkan slug
    const classData = await this.classRepository.findOne({
      where: { slug: classSlug },
    });

    if (!classData) {
      throw new NotFoundException(`Class with slug ${classSlug} not found`);
    }

    // Cari ClassTask yang sesuai
    const classTask = await this.classTaskRepository.findOne({
      where: {
        class: { slug: classSlug },
        task: { slug: taskSlug },
      },
      relations: {
        class: true,
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

    const { class: classEntity, task } = classTask;

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

    // Kembalikan DTO yang sudah dipetakan
    return TaskResponseMapper.mapClassTaskWithQuestions(
      classTask,
      classEntity,
      task,
      lastAttemptId,
      attemptAnswerLogs,
    );
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

    return TaskAttemptResponseMapper.mapClassTaskSummaryFromAttempt(attempt);
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

    return {
      status: 200,
      isSuccess: true,
      message: 'Task has been shared into selected classes.',
    };
  }
}
