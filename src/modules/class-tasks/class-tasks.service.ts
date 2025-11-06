import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { Class } from '../classes/entities/class.entity';
import { FilterClassTaskDto } from './dto/requests/filter-class-task.dto';
import { ClassTaskResponseDto } from './dto/responses/class-task-response.dto';
import {
  getDateTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import {
  ClassTaskDetailResponseDto,
  CurrentAttempt,
  RecentAttempt,
} from './dto/responses/class-task-detail-response.dto';
import {
  ClassTaskWithQuestionsResponseDto,
  Question,
  QuestionOption,
} from './dto/responses/class-task-with-questions-response.dto';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { TaskAttemptStatus } from '../task-attempts/enums/task-attempt-status.enum';
import { Task } from '../tasks/entities/task.entity';
import { TaskAnswerLog } from '../task-answer-logs/entities/task-answer-log.entity';
import {
  AnswerLog,
  ClassTaskSummaryResponseDto,
} from './dto/responses/class-task-summary-response.dto';

@Injectable()
export class ClassTaskService {
  constructor(
    @InjectRepository(ClassTask)
    private readonly classTaskRepository: Repository<ClassTask>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    // @InjectRepository(Task)
    // private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
    @InjectRepository(TaskAnswerLog)
    private readonly taskAnswerLogRepository: Repository<TaskAnswerLog>,
  ) {}

  /**
   * Find available tasks in a class
   */
  async findClassTasks(
    classSlug: string,
    filterDto: FilterClassTaskDto,
  ): Promise<ClassTaskResponseDto[]> {
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
      where: { class: { class_id } }, // Penting: hanya ambil task dari class ini
      relations: {
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

    // Mapping ke DTO
    const tasks: ClassTaskResponseDto[] = classTasks.map((ct) => ({
      title: ct.task.title,
      slug: ct.task.slug,
      image: ct.task.image != '' ? ct.task.image : null,
      type: ct.task.taskType?.name ?? '-',
      subject: ct.task.subject?.name ?? '-',
      questionCount: Number(ct.task.taskQuestions?.length) ?? 0,
      deadline: getDateTime(ct.task.end_time) ?? null,
    }));

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
        task: {
          subject: true,
          material: true,
          taskType: true,
          taskGrades: { grade: true },
          taskQuestions: true,
        },
      },
      order: {
        task: {
          taskQuestions: { order: 'ASC' },
        },
      },
    });

    if (!classTask)
      throw new NotFoundException(
        `Task with slug ${taskSlug} not found in this class`,
      );

    const task = classTask.task;

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
      const recentAttempt = await this.taskAttemptRepository.findOne({
        where: {
          student_id: userId,
          task_id: task.task_id,
          class_id: classEntity.class_id,
          status: TaskAttemptStatus.COMPLETED,
        },
        order: { completed_at: 'DESC' },
      });

      if (recentAttempt) {
        recentAttemptMeta = {
          startedAt: getDateTime(recentAttempt.started_at),
          lastAccessedAt: getDateTime(recentAttempt.last_accessed_at),
          completedAt: getDateTime(recentAttempt.completed_at),
          status: recentAttempt.status as TaskAttemptStatus,
        };
      }
    }

    // Mapping ke DTO final
    return this.mapClassTaskDetailResponse(
      classTask,
      currAttemptMeta,
      recentAttemptMeta,
    );
  }

  private mapClassTaskDetailResponse(
    classTask: ClassTask,
    currAttemptMeta: CurrentAttempt,
    recentAttemptMeta: RecentAttempt,
  ): ClassTaskDetailResponseDto {
    const { task } = classTask;

    return {
      id: task.task_id,
      title: task.title,
      slug: task.slug,
      description: task.description ?? null,
      image: task.image ?? null,
      subject: task.subject
        ? { id: task.subject.subject_id, name: task.subject.name }
        : null,
      material: task.material
        ? { id: task.material.material_id, name: task.material.name }
        : null,
      grade:
        task.taskGrades?.length > 0
          ? task.taskGrades
              .map((tg) => tg.grade?.name.replace('Kelas ', ''))
              .join(', ')
          : null,
      questionCount: task.taskQuestions?.length || 0,
      createdBy: task.created_by || 'Unknown',
      type: {
        id: task.taskType.task_type_id,
        name: task.taskType.name,
        isRepeatable: task.taskType.is_repeatable,
      },
      currAttempt:
        currAttemptMeta?.status === TaskAttemptStatus.ON_PROGRESS
          ? currAttemptMeta
          : null,
      recentAttempt: recentAttemptMeta?.completedAt ? recentAttemptMeta : null,
      duration: {
        startTime: task.start_time ?? null,
        endTime: task.end_time ?? null,
        duration: getTimePeriod(task.start_time, task.end_time),
      },
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

    // 3️⃣ Default values
    let lastAttemptId: string | null = null;
    let attemptAnswerLogs: TaskAnswerLog[] = [];

    // 4️⃣ Jika user login → cari attempt dan jawaban user
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
    classSlug: string,
    taskSlug: string,
    userId?: string,
  ): Promise<ClassTaskSummaryResponseDto> {
    // 1) Validasi class existence
    const classEntity = await this.classRepository.findOne({
      where: { slug: classSlug },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with slug ${classSlug} not found`);
    }

    // 2) Cari attempt yang completed untuk user, taskSlug dan class
    const attempt = await this.taskAttemptRepository.findOne({
      where: {
        student_id: userId,
        status: 'completed',
        task: { slug: taskSlug },
        class_id: classEntity.class_id,
      },
      relations: {
        task: {
          taskQuestions: {
            taskQuestionOptions: true,
          },
        },
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
        `No completed attempt found for user ${userId} on task ${taskSlug}`,
      );
    }

    return this.mapClassTaskSummaryFromAttempt(attempt);
  }

  private mapClassTaskSummaryFromAttempt(
    attempt: TaskAttempt,
  ): ClassTaskSummaryResponseDto {
    const { title, image, description } = attempt.task;
    const { points, xp_gained, completed_at, task, taskAnswerLogs } = attempt;

    const questions: Question[] =
      task.taskQuestions?.map((q) => {
        // find user answer log for this question (match by question id)
        const userAnswer = taskAnswerLogs?.find(
          (log) => log.question_id === q.task_question_id,
        );

        const options: QuestionOption[] =
          q.taskQuestionOptions?.map((o) => ({
            optionId: o.task_question_option_id,
            text: o.text,
            isCorrect: !!o.is_correct,
            isSelected: userAnswer?.option_id === o.task_question_option_id,
          })) || [];

        const answerLog: AnswerLog | null = userAnswer
          ? {
              answerLogId: userAnswer.task_answer_log_id ?? null,
              text: userAnswer.answer_text ?? null,
              image: userAnswer.image ?? null,
              optionId: userAnswer.option_id ?? null,
              isCorrect:
                typeof userAnswer.is_correct === 'boolean'
                  ? userAnswer.is_correct
                  : null,
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
      point: points ?? 0,
      xpGained: xp_gained ?? 0,
      completedAt: getDateTime(completed_at),
      questions,
    };
  }
}
