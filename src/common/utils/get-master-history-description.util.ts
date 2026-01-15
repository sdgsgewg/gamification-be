import { MasterHistoryTransactionType } from 'src/modules/master-history/enums/master-history-transaction-type';

export function getMasterHistoryDescription(
  transactionType: MasterHistoryTransactionType,
  entityName: string,
  oldData?: Record<string, any>,
  newData?: Record<string, any>,
): string {
  switch (transactionType) {
    case MasterHistoryTransactionType.INSERT:
      return `You created a new ${entityName} "${newData?.name || newData?.title || 'item'}".`;

    case MasterHistoryTransactionType.UPDATE:
      const oldName = oldData?.name || oldData?.title || 'item';
      const newName = newData?.name || newData?.title || oldName;

      const text =
        oldName !== newName
          ? `You updated the ${entityName} "${oldName}" to "${newName}".`
          : `You updated the ${entityName} "${oldName}"`;

      return text;

    case MasterHistoryTransactionType.DELETE:
      return `You deleted the ${entityName} "${oldData?.name || oldData?.title || 'item'}".`;

    case MasterHistoryTransactionType.FINALIZE:
      return `You finalized the ${entityName} "${oldData?.name || oldData?.title || 'item'}".`;

    case MasterHistoryTransactionType.PUBLISH:
      return `You published the ${entityName} "${oldData?.name || oldData?.title || 'item'}".`;

    case MasterHistoryTransactionType.UNPUBLISH:
      return `You unpublished the ${entityName} "${oldData?.name || oldData?.title || 'item'}".`;

    case MasterHistoryTransactionType.ARCHIVE:
      return `You archived the ${entityName} "${oldData?.name || oldData?.title || 'item'}".`;

    default:
      return `You performed an action on ${entityName}.`;
  }
}
