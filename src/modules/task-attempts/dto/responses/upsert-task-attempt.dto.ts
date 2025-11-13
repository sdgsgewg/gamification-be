export class UpsertTaskAttemptResponseDto {
  leveledUp: boolean;
  levelChangeSummary?: {
    previousLevel: number;
    newLevel: number;
    previousXp: number;
    newXp: number;
    levelsGained: number;
  } | null;
}
