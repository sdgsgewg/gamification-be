import { ActivityLogEventType } from 'src/modules/activty-logs/enums/activity-log-event-type';
import { UserRole } from 'src/modules/roles/enums/user-role.enum';

export function getActivityLogDescription(
  eventType: ActivityLogEventType,
  entityName: string,
  data?: Record<string, any>,
  role?: UserRole,
): string {
  switch (eventType) {
    case ActivityLogEventType.TASK_STARTED:
      return `You started the task "${data?.task.title || 'Unnamed Task'}".`;

    case ActivityLogEventType.TASK_LAST_ACCESSED:
      return `You last accessed the task "${data?.task.title || 'Unnamed Task'}".`;

    case ActivityLogEventType.TASK_SUBMITTED:
      return `You submitted the task "${data?.task.title || 'Unnamed Task'}".`;

    case ActivityLogEventType.TASK_COMPLETED:
      return `You completed the task "${data?.task.title || 'Unnamed Task'}" and earned ${data?.xpGained} XP.`;

    case ActivityLogEventType.TASK_GRADED:
      return role === UserRole.STUDENT
        ? `Your task "${data?.task.title || 'Unnamed Task'}" from class "${data?.class?.name || 'Unnamed Class'}" has been graded and you earned ${data?.xpGained} XP.`
        : role === UserRole.TEACHER
          ? `You have graded ${data?.student?.name || 'a student'}'s submission from class "${data?.class?.name || 'Unnamed Class'}" for "${data?.task.title || 'Unnamed Task'}".`
          : '';

    case ActivityLogEventType.LOGIN:
      return `You logged in to the system.`;

    case ActivityLogEventType.LOGOUT:
      return `You logged out of the system.`;

    default:
      return `You performed an action on ${entityName}.`;
  }
}
