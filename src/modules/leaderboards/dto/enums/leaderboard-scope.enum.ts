export enum LeaderboardScope {
  GLOBAL = 'GLOBAL',
  ACTIVITY = 'ACTIVITY',
  CLASS = 'CLASS',
}

export const LeaderboardScopeLabels: Record<LeaderboardScope, string> = {
  [LeaderboardScope.GLOBAL]: 'Global',
  [LeaderboardScope.ACTIVITY]: 'Activity',
  [LeaderboardScope.CLASS]: 'Class',
};
