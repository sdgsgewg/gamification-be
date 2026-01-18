import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
// import { FilterTaskSubmissionDto } from './dto/requests/filter-task-submission.dto';
// import { GroupedTaskSubmissionResponseDto } from './dto/responses/grouped-task-submission-response.dto';
import {
  getDateTime,
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
import { TeacherClassTaskAnalyticsDto } from './dto/responses/teacher-class-task-analytics-response.dto';
import { Class } from '../classes/entities/class.entity';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { ClassTaskAttemptAnalyticsResponseDto } from './dto/responses/class-task-attempt-analytics-response.dto';
import { StudentTaskAttemptAnalyticsDto } from '../task-attempts/dto/responses/student-attempt/student-task-attempt-analytics-response.dto';
// import { TaskSubmissionResponseMapper } from './mapper/task-submission-response.mapper';

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
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassTask)
    private readonly classTaskRepository: Repository<ClassTask>,
    private readonly userService: UserService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // async findAllTaskSubmissions(
  //   userId: string,
  //   filterDto: FilterTaskSubmissionDto,
  // ): Promise<GroupedTaskSubmissionResponseDto[]> {
  //   const qb = this.taskSubmissionRepository
  //     .createQueryBuilder('ts')
  //     .leftJoinAndSelect('ts.taskAttempt', 'ta')
  //     .leftJoinAndSelect('ta.class', 'c')
  //     .leftJoinAndSelect('ta.task', 't')
  //     .leftJoinAndSelect('ta.student', 's');

  //   // Filter berdasarkan user id
  //   qb.where('c.teacher_id = :teacherId', { teacherId: userId });

  //   // Tambahkan filter status
  //   if (filterDto.status) {
  //     qb.andWhere('ts.status = :status', { status: filterDto.status });
  //   }

  //   // Filter berdasarkan nama siswa
  //   if (filterDto.searchText) {
  //     qb.andWhere('s.name ILIKE :name', { name: `%${filterDto.searchText}%` });
  //   }

  //   // Sorting dinamis
  //   const orderBy = filterDto.orderBy ?? 'ts.created_at';
  //   const orderState = filterDto.orderState ?? 'ASC';
  //   qb.orderBy(orderBy, orderState as 'ASC' | 'DESC');

  //   // Eksekusi query
  //   const submissions = await qb.getMany();

  //   if (!submissions.length) {
  //     throw new NotFoundException(
  //       `No submission found for teacher with id ${userId}`,
  //     );
  //   }

  //   const groupByGraded = filterDto.status === TaskSubmissionStatus.COMPLETED;

  //   return TaskSubmissionResponseMapper.mapAndGroupTaskSubmissions(
  //     submissions,
  //     groupByGraded,
  //   );
  // }

  // async findTaskSubmissionsInClass(
  //   classSlug: string,
  //   taskSlug: string,
  //   filterDto: FilterTaskSubmissionDto,
  // ): Promise<GroupedTaskSubmissionResponseDto[]> {
  //   const qb = this.taskSubmissionRepository
  //     .createQueryBuilder('ts')
  //     .leftJoinAndSelect('ts.taskAttempt', 'ta')
  //     .leftJoinAndSelect('ta.class', 'c')
  //     .leftJoinAndSelect('ta.task', 't')
  //     .leftJoinAndSelect('ta.student', 's');

  //   // Filter berdasarkan class dan task slug
  //   qb.where('c.slug = :classSlug', { classSlug }).andWhere(
  //     't.slug = :taskSlug',
  //     { taskSlug },
  //   );

  //   // Tambahkan filter status
  //   if (filterDto.status) {
  //     qb.andWhere('ts.status = :status', { status: filterDto.status });
  //   }

  //   // Filter berdasarkan nama siswa
  //   if (filterDto.searchText) {
  //     qb.andWhere('s.name ILIKE :name', { name: `%${filterDto.searchText}%` });
  //   }

  //   // Sorting dinamis
  //   const orderBy = filterDto.orderBy ?? 'ts.created_at';
  //   const orderState = filterDto.orderState ?? 'ASC';
  //   qb.orderBy(orderBy, orderState as 'ASC' | 'DESC');

  //   // Eksekusi query
  //   const submissions = await qb.getMany();

  //   if (!submissions.length) {
  //     throw new NotFoundException(
  //       `No submission found for class with slug ${classSlug} and task with slug ${taskSlug}`,
  //     );
  //   }

  //   const groupByGraded = filterDto.status === TaskSubmissionStatus.COMPLETED;

  //   return TaskSubmissionResponseMapper.mapAndGroupTaskSubmissions(
  //     submissions,
  //     groupByGraded,
  //   );
  // }

  async findAllTaskSubmissions(
    teacherId: string,
  ): Promise<TeacherClassTaskAnalyticsDto[]> {
    // 1️⃣ Ambil semua class yang diajar guru
    const classes = await this.classRepository.find({
      where: { teacher_id: teacherId },
      relations: {
        classStudents: true,
      },
    });

    if (!classes.length) {
      throw new NotFoundException('No class found for this teacher');
    }

    const classIds = classes.map((c) => c.class_id);

    // 2️⃣ Ambil class_tasks + task
    const classTasks = await this.classTaskRepository.find({
      where: {
        class: { class_id: In(classIds) },
      },
      relations: {
        class: {
          classStudents: true,
        },
        task: {
          taskType: true,
        },
      },
    });

    if (!classTasks.length) return [];

    // 3️⃣ Ambil semua attempt untuk class-task tsb
    const attempts = await this.taskAttemptRepository
      .createQueryBuilder('ta')
      .leftJoinAndSelect('ta.task', 't')
      .leftJoinAndSelect('ta.class', 'c')
      .where('ta.class_id IN (:...classIds)', { classIds })
      .getMany();

    // 4️⃣ Grouping: classId-taskId
    const attemptMap = new Map<string, typeof attempts>();

    for (const attempt of attempts) {
      const key = `${attempt.class_id}-${attempt.task_id}`;
      if (!attemptMap.has(key)) {
        attemptMap.set(key, []);
      }
      attemptMap.get(key).push(attempt);
    }

    // 5️⃣ Build analytics
    return classTasks.map((ct) => {
      const key = `${ct.class_id}-${ct.task_id}`;
      const taskAttempts = attemptMap.get(key) ?? [];

      const totalStudents = ct.class.classStudents.length;

      const attemptsByStudent = new Map<string, TaskAttempt[]>();
      taskAttempts.forEach((a) => {
        if (!attemptsByStudent.has(a.student_id)) {
          attemptsByStudent.set(a.student_id, []);
        }
        attemptsByStudent.get(a.student_id).push(a);
      });

      const studentsAttempted = attemptsByStudent.size;

      let completedCount = 0;
      const latestScores: number[] = [];
      const allScores: number[] = [];
      let totalAttempts = 0;

      attemptsByStudent.forEach((studentAttempts) => {
        totalAttempts += studentAttempts.length;

        const sorted = studentAttempts.sort(
          (a, b) =>
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
        );

        const latest = sorted[sorted.length - 1];

        if (latest.status === TaskAttemptStatus.COMPLETED) {
          completedCount++;
        }

        if (latest.points !== null) {
          latestScores.push(latest.points);
        }

        sorted.forEach((a) => {
          if (a.points !== null) {
            allScores.push(a.points);
          }
        });
      });

      return {
        className: ct.class.name,
        classSlug: ct.class.slug,

        taskTitle: ct.task.title,
        taskSlug: ct.task.slug,
        isRepeatable: ct.task.taskType.is_repeatable,

        totalStudents,
        studentsAttempted,
        studentsCompleted: completedCount,

        avgScoreLatestAttempt:
          latestScores.length > 0
            ? Number(
                (
                  latestScores.reduce((a, b) => a + b, 0) / latestScores.length
                ).toFixed(2),
              )
            : 0,

        avgScoreAllAttempts:
          allScores.length > 0
            ? Number(
                (
                  allScores.reduce((a, b) => a + b, 0) / allScores.length
                ).toFixed(2),
              )
            : 0,

        avgAttemptsPerStudent:
          studentsAttempted > 0
            ? Number((totalAttempts / studentsAttempted).toFixed(2))
            : 0,

        deadline: ct.end_time?.toISOString() ?? null,
      };
    });
  }

  async findTaskSubmissionsInClass(
    classSlug: string,
    taskSlug: string,
  ): Promise<ClassTaskAttemptAnalyticsResponseDto> {
    // Validasi class-task
    const classTask = await this.classTaskRepository.findOne({
      where: {
        class: { slug: classSlug },
        task: { slug: taskSlug },
      },
      relations: {
        class: true,
        task: true,
      },
    });

    if (!classTask) {
      throw new NotFoundException('Task not found in this class');
    }

    // Ambil semua attempt
    const attempts = await this.taskAttemptRepository
      .createQueryBuilder('ta')
      .leftJoinAndSelect('ta.student', 's')
      .leftJoinAndSelect('ta.taskSubmission', 'ts')
      .where('ta.class_id = :classId', {
        classId: classTask.class_id,
      })
      .andWhere('ta.task_id = :taskId', {
        taskId: classTask.task_id,
      })
      .orderBy('ta.started_at', 'ASC')
      .getMany();

    if (!attempts.length) {
      return {
        className: classTask.class.name,
        taskTitle: classTask.task.title,
        taskSlug,
        averageScoreAllStudents: 0,
        averageAttempts: 0,
        students: [],
      };
    }

    // Group by student
    const studentMap = new Map<string, typeof attempts>();

    attempts.forEach((attempt) => {
      if (!studentMap.has(attempt.student_id)) {
        studentMap.set(attempt.student_id, []);
      }
      studentMap.get(attempt.student_id).push(attempt);
    });

    let totalScore = 0;
    let totalAttempts = 0;

    const students: StudentTaskAttemptAnalyticsDto[] = [];

    studentMap.forEach((studentAttempts, studentId) => {
      const sorted = [...studentAttempts].sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      );

      const scores = sorted
        .map((a) => a.points)
        .filter((p): p is number => p !== null);

      const firstScore = scores[0];
      const lastScore = scores[scores.length - 1];

      totalScore += scores.reduce((a, b) => a + b, 0);
      totalAttempts += sorted.length;

      // LATEST ATTEMPT
      const latestAttempt = sorted[sorted.length - 1];

      students.push({
        studentId,
        studentName: sorted[0].student.name,

        totalAttempts: sorted.length,
        firstAttemptScore: firstScore,
        lastAttemptScore: lastScore,
        averageScore:
          scores.length > 0
            ? Number(
                (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
              )
            : 0,
        improvement: scores.length > 1 ? lastScore - firstScore : 0,

        latestStatus: latestAttempt.status,
        latestSubmissionId:
          latestAttempt?.taskSubmission?.task_submission_id ?? undefined,

        attempts: sorted.map((a, idx) => ({
          submissionId: a.taskSubmission?.task_submission_id,
          attemptNumber: idx + 1,
          attemptId: a.task_attempt_id,
          score: a.points,
          status: a.status,
          completedAt: a.completed_at,
        })),
      });
    });

    return {
      className: classTask.class.name,
      taskTitle: classTask.task.title,
      taskSlug,
      averageScoreAllStudents:
        totalAttempts > 0 ? Number((totalScore / totalAttempts).toFixed(2)) : 0,
      averageAttempts:
        students.length > 0
          ? Number((totalAttempts / students.length).toFixed(2))
          : 0,
      students,
    };
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
