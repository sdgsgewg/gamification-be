import { format } from 'date-fns';
import { GroupedTaskSubmissionResponseDto } from '../dto/responses/grouped-task-submission-response.dto';
import { TaskSubmission } from '../entities/task-submission.entity';
import { TaskSubmissionStatus } from '../enums/task-submission-status.enum';
import { getTime } from 'src/common/utils/date-modifier.util';
import { id } from 'date-fns/locale';

export class TaskSubmissionResponseMapper {
  // ==============================
  // MAP AND GROUP TASK SUBMISSION
  // ==============================
  static mapAndGroupTaskSubmissions(
    submissions: TaskSubmission[],
    groupByGraded: boolean,
  ): GroupedTaskSubmissionResponseDto[] {
    const grouped = submissions.reduce(
      (acc, submission) => {
        const { title, image } = submission.taskAttempt.task;
        const { name: className } = submission.taskAttempt.class;
        const { name: studentName } = submission.taskAttempt.student;
        const {
          task_submission_id,
          status,
          created_at,
          last_graded_at,
          finish_graded_at,
        } = submission;

        // Pilih tanggal berdasarkan mode grouping
        const dateValue = groupByGraded ? finish_graded_at : created_at;
        if (!dateValue) return acc;

        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return acc;

        const dateKey = format(date, 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = {
            dateLabel: format(date, 'd MMM yyyy', { locale: id }),
            dayLabel: format(date, 'EEEE', { locale: id }),
            submissions: [],
          };
        }

        const gradedTime =
          status === TaskSubmissionStatus.COMPLETED
            ? getTime(finish_graded_at)
            : status === TaskSubmissionStatus.ON_PROGRESS
              ? getTime(last_graded_at)
              : getTime(created_at);

        // Map langsung ke DTO kecil di sini
        acc[dateKey].submissions.push({
          id: task_submission_id,
          title,
          image: image !== '' ? image : null,
          className,
          studentName,
          status,
          submittedTime: getTime(created_at),
          gradedTime,
        });

        return acc;
      },
      {} as Record<string, GroupedTaskSubmissionResponseDto>,
    );

    return Object.values(grouped);
  }
}
