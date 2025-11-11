import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { Class } from '../classes/entities/class.entity';
import { FilterClassTaskDto } from './dto/requests/filter-class-task.dto';
import { StudentClassTaskResponseDto } from './dto/responses/student-class-task-response.dto';
import {
  getDateTime,
  getTimePeriod,
} from 'src/common/utils/date-modifier.util';
import {
  ClassTaskDetailResponseDto,
  CurrentAttempt,
  TaskDuration,
  TaskType,
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
import { TaskDifficultyLabels } from '../tasks/enums/task-difficulty.enum';
import { TeacherClassTaskResponseDto } from './dto/responses/teacher-class-task-response.dto';
import { ShareTaskIntoClassesDto } from './dto/requests/share-task-into-classes-request.dto';
import { AvailableClassesResponseDto } from './dto/responses/available-classes-reponse.dto';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { FilterClassDto } from '../classes/dto/requests/filter-class.dto';

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
  ) {}

  /**
   * Find available tasks for student in a class
   */
  async findStudentClassTasks(
    classSlug: string,
    filterDto: FilterClassTaskDto,
  ): Promise<StudentClassTaskResponseDto[]> {
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
    const tasks: StudentClassTaskResponseDto[] = classTasks.map((ct) => ({
      title: ct.task.title,
      slug: ct.task.slug,
      image: ct.task.image != '' ? ct.task.image : null,
      type: ct.task.taskType?.name ?? '-',
      subject: ct.task.subject?.name ?? '-',
      questionCount: Number(ct.task.taskQuestions?.length) ?? 0,
      deadline: getDateTime(ct.end_time) ?? null,
    }));

    return tasks;
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
    let currAttemptMeta: CurrentAttempt = {
      answeredCount: 0,
      startedAt: null,
      lastAccessedAt: null,
      status: TaskAttemptStatus.NOT_STARTED,
    };

    // let recentAttemptMeta: TaskAttempt | null = null;
    let recentAttempt: TaskAttempt | null = null;

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
      recentAttempt = await this.taskAttemptRepository.findOne({
        where: {
          student_id: userId,
          task_id: task.task_id,
          class_id: classEntity.class_id,
          status: In([
            TaskAttemptStatus.SUBMITTED,
            TaskAttemptStatus.COMPLETED,
          ]),
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
          taskSubmission: {
            grader: true,
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

      // if (recentAttempt) {
      //   recentAttemptMeta = recentAttempt;
      // }
    }

    // Mapping ke DTO final
    return this.mapClassTaskDetailResponse(
      classTask,
      currAttemptMeta,
      // recentAttemptMeta,
      recentAttempt,
    );
  }

  private mapClassTaskDetailResponse(
    classTask: ClassTask,
    currAttemptMeta: CurrentAttempt,
    recentAttempt: TaskAttempt | null,
  ): ClassTaskDetailResponseDto {
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
      start_time,
      end_time,
      created_by,
    } = classTask.task;

    // const score = Math.round((points / totalPoints) * 100);

    const type: TaskType = {
      id: taskType.task_type_id,
      name: taskType.name,
      isRepeatable: taskType.is_repeatable,
    };

    const currAttempt: CurrentAttempt | null =
      currAttemptMeta?.status === TaskAttemptStatus.ON_PROGRESS
        ? currAttemptMeta
        : null;

    const duration: TaskDuration = {
      startTime: start_time ?? null,
      endTime: end_time ?? null,
      duration: getTimePeriod(start_time, end_time),
    };

    return {
      id: task_id,
      title,
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
              .map((tg) => tg.grade?.name.replace('Kelas ', ''))
              .join(', ')
          : null,
      difficulty: TaskDifficultyLabels[difficulty] ?? 'Unknown',
      questionCount: taskQuestions?.length || 0,
      createdBy: created_by || 'Unknown',
      type,
      currAttempt,
      recentAttempt: recentAttempt
        ? {
            startedAt: getDateTime(recentAttempt.started_at),
            lastAccessedAt: getDateTime(recentAttempt.last_accessed_at),
            submittedAt: getDateTime(
              recentAttempt.taskSubmission?.created_at ?? null,
            ),
            completedAt: getDateTime(recentAttempt.completed_at),
            status: recentAttempt.status as TaskAttemptStatus,
          }
        : null,
      stats:
        recentAttempt && recentAttempt.taskSubmission
          ? {
              pointGained: recentAttempt.points,
              xpGained: recentAttempt.xp_gained,
              totalPoints: taskQuestions.reduce(
                (acc, question) => acc + (question.point ?? 0),
                0,
              ),
              score: recentAttempt.taskSubmission?.score ?? null,
            }
          : null,
      duration,
      questions:
        recentAttempt && recentAttempt.taskSubmission
          ? recentAttempt.task.taskQuestions.map((q) => {
              const userAnswer = recentAttempt.taskAnswerLogs.find(
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
                  isSelected:
                    userAnswer?.option_id === o.task_question_option_id,
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
            })
          : [],
      submission: recentAttempt?.taskSubmission
        ? {
            score: recentAttempt.taskSubmission.score,
            feedback: recentAttempt.taskSubmission.feedback,
            status: recentAttempt.taskSubmission.status,
            gradedBy: recentAttempt.taskSubmission.graded_by
              ? (recentAttempt.taskSubmission.grader?.name ?? null)
              : null,
            gradedAt: recentAttempt.taskSubmission.finish_graded_at
              ? getDateTime(recentAttempt.taskSubmission.finish_graded_at)
              : null,
          }
        : null,
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
        status: TaskAttemptStatus.SUBMITTED,
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

  /**
   * Find classes that can be shared for this task
   */
  async findAvailableClasses(
    taskId: string,
    teacherId: string,
    filterDto: FilterClassDto,
  ): Promise<AvailableClassesResponseDto[]> {
    console.log('Task id: ', taskId);
    console.log('Teacher id: ', teacherId);
    console.log('Filter dto: ', JSON.stringify(filterDto, null, 2));

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
  ): Promise<BaseResponseDto> {
    const { taskId, classIds, startTime, endTime } = dto;

    if (!classIds || classIds.length === 0) {
      return {
        status: 400,
        isSuccess: false,
        message: 'No class IDs provided.',
      };
    }

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

    const newClassTasks = classIds.map((classId) =>
      this.classTaskRepository.create({
        class_id: classId,
        task_id: taskId,
        start_time: finalStartTime,
        end_time: finalEndTime,
      }),
    );

    // Simpan semua sekaligus
    await this.classTaskRepository.save(newClassTasks);

    // Buat task attempt untuk siswa di kelas
    for (const classId of classIds) {
      // ambil semua student di kelas tersebut
      const classEntity = await this.classRepository.findOne({
        where: { class_id: classId },
        relations: {
          classStudents: {
            student: true,
          },
        },
      });

      if (
        !classEntity ||
        !classEntity.classStudents ||
        classEntity.classStudents.length === 0
      )
        continue;

      // siapkan task attempts
      const taskAttempts = classEntity.classStudents.map((cs) =>
        this.taskAttemptRepository.create({
          task_id: taskId,
          student_id: cs.student.user_id,
          class_id: classId,
          status: TaskAttemptStatus.NOT_STARTED,
        }),
      );

      // simpan sekaligus biar efisien
      await this.taskAttemptRepository.save(taskAttempts);
    }

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Task has been shared into selected classes.',
    };

    return response;
  }
}
