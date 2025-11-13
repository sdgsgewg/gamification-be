export class LevelHelper {
  /**
   * Hitung total XP yang dibutuhkan untuk mencapai level tertentu.
   */
  static getTotalXpForLevel(level: number): number {
    if (level <= 1) return 0;

    const baseXp = 100;
    const increment = 30;

    // Rumus deret aritmetika: total = n/2 * (2a + (n-1)d)
    const n = level - 1;
    const totalXp = (n / 2) * (2 * baseXp + (n - 1) * increment);

    return Math.round(totalXp);
  }

  /**
   * Hitung XP progress dari pengguna.
   */
  static getXpProgress(currXp: number, nextLvlMinXp): number {
    const xpProgress = Math.round((currXp / nextLvlMinXp) * 100);
    return xpProgress;
  }

  /**
   * Hitung level dan XP baru setelah mendapat XP tambahan.
   */
  static getUserLevel(
    currLvl: number,
    currXp: number,
    xpGained: number,
  ): { newLevel: number; newXp: number } {
    const totalXp = currXp + xpGained;
    let newLevel = currLvl;

    // Naik level jika XP melebihi threshold
    while (totalXp >= this.getTotalXpForLevel(newLevel + 1)) {
      newLevel++;
    }

    return { newLevel, newXp: totalXp };
  }

  /**
   * Hitung level dan XP sebelum mendapatkan XP tambahan terakhir.
   */
  static getUserPreviousLevel(
    currLvl: number,
    currXp: number,
    xpGained: number,
  ): { previousLevel: number; previousXp: number } {
    // XP sebelum task attempt
    const previousXp = currXp - xpGained;
    let previousLevel = currLvl;

    // Jika XP turun di bawah threshold level saat ini, berarti level sebelumnya
    while (
      previousLevel > 1 &&
      previousXp < this.getTotalXpForLevel(previousLevel)
    ) {
      previousLevel--;
    }

    return { previousLevel, previousXp };
  }

  /**
   * Ringkasan perubahan level & XP (sebelum dan sesudah mendapatkan XP tambahan).
   * Cocok untuk menampilkan efek "Level Up!" di UI.
   */
  static getLevelChangeSummary(
    currLvl: number,
    currXp: number,
    xpGained: number,
  ): {
    previousLevel: number;
    previousXp: number;
    newLevel: number;
    newXp: number;
    leveledUp: boolean;
    levelsGained: number;
  } {
    const { previousLevel, previousXp } = this.getUserPreviousLevel(
      currLvl,
      currXp,
      xpGained,
    );

    const { newLevel, newXp } = this.getUserLevel(
      previousLevel,
      previousXp,
      xpGained,
    );

    const levelsGained = newLevel - previousLevel;
    const leveledUp = levelsGained > 0;

    return {
      previousLevel,
      previousXp,
      newLevel,
      newXp,
      leveledUp,
      levelsGained,
    };
  }
}
