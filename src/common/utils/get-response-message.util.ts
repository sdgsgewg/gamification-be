type EntityName =
  | 'subject'
  | 'material'
  | 'task-type'
  | 'task'
  | 'task-attempt'
  | 'task-submission'
  | 'user'
  | 'class'
  | string;
type ActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'finalize'
  | 'fetch'
  | 'assign'
  | 'unassign';

interface MessageOptions {
  entity: EntityName;
  action: ActionType;
  locale?: 'en' | 'id';
}

export function getResponseMessage({
  entity,
  action,
  locale = 'en',
}: MessageOptions): string {
  const entityName =
    locale === 'id'
      ? getEntityNameInIndonesian(entity)
      : formatEntityName(entity);

  const messages = {
    en: {
      create: `${entityName} created successfully.`,
      update: `${entityName} updated successfully.`,
      delete: `${entityName} deleted successfully.`,
      publish: `${entityName} published successfully.`,
      unpublish: `${entityName} unpublished successfully.`,
      finalize: `${entityName} finalized successfully.`,
      fetch: `${entityName} fetched successfully.`,
      assign: `${entityName} assigned successfully.`,
      unassign: `${entityName} unassigned successfully.`,
    },
    id: {
      create: `${entityName} berhasil dibuat!`,
      update: `${entityName} berhasil diperbarui!`,
      delete: `${entityName} berhasil dihapus!`,
      fetch: `${entityName} berhasil diambil!`,
      assign: `${entityName} berhasil ditugaskan!`,
      unassign: `${entityName} berhasil dibatalkan penugasannya!`,
    },
  };

  return messages[locale][action] ?? '';
}

/**
 * Convert kebab-case / snake_case entity name to Title Case.
 * e.g. "task-type" → "Task Type", "library_transaction" → "Library Transaction"
 */
function formatEntityName(entity: string): string {
  return entity
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Mapping for Indonesian names
 */
function getEntityNameInIndonesian(entity: string): string {
  const mapping: Record<string, string> = {
    subject: 'Mata pelajaran',
    material: 'Materi',
    'task-type': 'Tipe tugas',
    task: 'Tugas',
    user: 'Pengguna',
  };

  return mapping[entity] ?? formatEntityName(entity);
}
