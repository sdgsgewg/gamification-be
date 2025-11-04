import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { GlobalLeaderboardResponseDto } from './dto/responses/global-leaderboard-responses.dto';
import { UserRole } from '../roles/enums/user-role.enum';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findGlobalLeaderboard(): Promise<GlobalLeaderboardResponseDto[]> {
    // Ambil semua user dengan role "student" + relasi taskAttempts
    const users = await this.userRepository.find({
      relations: ['taskAttempts', 'role'],
      where: {
        role: { name: UserRole.STUDENT },
      },
    });

    if (!users || users.length === 0) {
      throw new NotFoundException('No student users found for leaderboard');
    }

    // Hitung total poin untuk tiap user
    const leaderboard = users.map((user) => {
      const totalPoints = user.taskAttempts?.reduce(
        (sum, attempt) => sum + (attempt.points || 0),
        0,
      );

      return {
        id: user.user_id,
        name: user.name,
        username: user.username,
        image: user.image,
        level: user.level || 0,
        xp: user.xp || 0,
        point: totalPoints || 0,
      };
    });

    // Urutkan berdasarkan poin dan XP tertinggi
    leaderboard.sort((a, b) => {
      if (b.point !== a.point) return b.point - a.point;
      return b.xp - a.xp;
    });

    // Tambahkan rank (peringkat)
    const rankedLeaderboard = leaderboard
      .slice(0, 50) // limit ke top 50
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

    return rankedLeaderboard;
  }
}
