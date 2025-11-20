import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClassTask } from '../class-tasks/entities/class-task.entity';
import { Class } from '../classes/entities/class.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { TaskAttemptStatus } from '../task-attempts/enums/task-attempt-status.enum';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { ClassStudent } from './entities/class-student.entity';
import { JoinClassDto } from './dto/requests/join-class-request.dto';
import { ActivityLogService } from '../activty-logs/activity-logs.service';
import { ActivityLogEventType } from '../activty-logs/enums/activity-log-event-type';
import { getActivityLogDescription } from 'src/common/utils/get-activity-log-description.util';
import { UserRole } from '../roles/enums/user-role.enum';
import { ClassStudentOverviewResponseDto } from './dto/responses/class-student-overview-reponse.dto';
import { TaskSubmissionStatus } from '../task-submissions/enums/task-submission-status.enum';
import { TaskSubmission } from '../task-submissions/entities/task-submission.entity';

@Injectable()
export class ClassStudentService {
  constructor(
    @InjectRepository(ClassStudent)
    private readonly classStudentRepository: Repository<ClassStudent>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassTask)
    private readonly classTaskRepository: Repository<ClassTask>,
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
    @InjectRepository(TaskSubmission)
    private readonly taskSubmissionRepository: Repository<TaskSubmission>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Find class students
   */
  async findClassStudents(
    classId: string,
  ): Promise<ClassStudentOverviewResponseDto[]> {
    const classStudents = await this.classStudentRepository.find({
      where: { class: { class_id: classId } },
      relations: ['student'],
    });

    const classStudentOverviews: ClassStudentOverviewResponseDto[] =
      classStudents.map((cs) => ({
        id: cs.student_id,
        name: cs.student.name,
        image: cs.student.image,
      }));

    return classStudentOverviews;
  }

  /**
   * Join class
   */
  async joinClass(dto: JoinClassDto, userId: string): Promise<BaseResponseDto> {
    const { classId } = dto;

    const classEntity = await this.classRepository.findOne({
      where: { class_id: classId },
    });

    if (!classEntity) {
      return {
        status: 404,
        isSuccess: false,
        message: 'Class not found.',
      };
    }

    // Masukkan student ke dalam class
    const newClassStudent = this.classStudentRepository.create({
      class_id: classId,
      student_id: userId,
      created_at: new Date(),
    });

    const savedClassStudent =
      await this.classStudentRepository.save(newClassStudent);

    // Simpan actvity log
    const description = getActivityLogDescription(
      ActivityLogEventType.JOIN_CLASS,
      'class student',
      { class: classEntity },
      UserRole.STUDENT,
    );

    await this.activityLogService.createActivityLog({
      userId,
      eventType: ActivityLogEventType.JOIN_CLASS,
      description,
      metadata: savedClassStudent,
    });

    // Buat task attempt untuk siswa di kelas baru
    // Ambil semua task yang ada di dalam kelas
    const classTasks = await this.classTaskRepository.find({
      where: { class_id: classId },
      relations: { task: true },
    });

    // Ambil semua attempt existing untuk user di class ini
    const existingAttempts = await this.taskAttemptRepository.find({
      where: { class_id: classId, student_id: userId },
      relations: {
        taskSubmission: true,
      },
    });

    const existingTaskIds = new Set(existingAttempts.map((a) => a.task_id));

    for (const ct of classTasks) {
      if (!existingTaskIds.has(ct.task_id)) {
        // Buat attempt baru hanya jika belum ada
        const taskAttempt = this.taskAttemptRepository.create({
          task_id: ct.task_id,
          student_id: userId,
          class_id: classId,
          status: TaskAttemptStatus.NOT_STARTED,
        });

        await this.taskAttemptRepository.save(taskAttempt);
      }
    }

    // Update status submission ke status sebelum leave
    for (const attempt of existingAttempts) {
      if (attempt.status !== TaskAttemptStatus.SUBMITTED) continue;

      const submission = attempt.taskSubmission;

      if (submission.status === TaskSubmissionStatus.COMPLETED) {
        continue;
      } else if (submission.start_graded_at || submission.last_graded_at) {
        submission.status = TaskSubmissionStatus.ON_PROGRESS;
      } else {
        submission.status = TaskSubmissionStatus.NOT_STARTED;
      }

      await this.taskSubmissionRepository.save(submission);
    }

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: `You have successfully joined class "${classEntity.name}".`,
    };

    return response;
  }

  /**
   * Leave class
   */
  private async cleanupTaskAttemptsOnLeave(classId: string, userId: string) {
    await this.taskAttemptRepository.delete({
      class_id: classId,
      student_id: userId,
      status: In([TaskAttemptStatus.NOT_STARTED]),
    });
  }

  private async cancelUnreviewedSubmissions(classId: string, userId: string) {
    // Update status submission untuk task yang sudah pernah disubmit
    const submittedTaskAttempts = await this.taskAttemptRepository.find({
      where: {
        class_id: classId,
        student_id: userId,
        status: TaskAttemptStatus.SUBMITTED,
      },
      relations: {
        taskSubmission: true,
      },
    });

    for (const attempt of submittedTaskAttempts) {
      const submission = attempt.taskSubmission;
      if (!submission) continue;

      if (attempt.taskSubmission.status !== TaskSubmissionStatus.COMPLETED) {
        // Update ke CANCELLED
        submission.status = TaskSubmissionStatus.CANCELLED;
        await this.taskSubmissionRepository.save(submission);
      }
    }
  }

  async leaveClass(classId: string, userId: string): Promise<BaseResponseDto> {
    const classEntity = await this.classRepository.findOne({
      where: { class_id: classId },
    });

    if (!classEntity) {
      return {
        status: 404,
        isSuccess: false,
        message: 'Class not found.',
      };
    }

    const existingClassStudent = await this.classStudentRepository.findOne({
      where: { class_id: classId, student_id: userId },
    });

    // Bersihkan task attempt yang belum selesai
    await this.cleanupTaskAttemptsOnLeave(classId, userId);

    // Update status submission ke CANCELLED (kecuali yang udah COMPLETED)
    await this.cancelUnreviewedSubmissions(classId, userId);

    // Hapus membership
    await this.classStudentRepository.delete({
      class_id: classId,
      student_id: userId,
    });

    // Log activity
    const description = getActivityLogDescription(
      ActivityLogEventType.LEAVE_CLASS,
      'class student',
      { class: classEntity },
      UserRole.STUDENT,
    );

    await this.activityLogService.createActivityLog({
      userId,
      eventType: ActivityLogEventType.LEAVE_CLASS,
      description,
      metadata: existingClassStudent,
    });

    return {
      status: 200,
      isSuccess: true,
      message: `You have left class "${classEntity.name}".`,
    };
  }
}
