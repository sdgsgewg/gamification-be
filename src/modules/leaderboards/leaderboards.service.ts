import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { GlobalLeaderboardResponseDto } from './dto/responses/global-leaderboard-responses.dto';
import { UserRole } from '../roles/enums/user-role.enum';
import { ClassStudentsLeaderboardResponseDto } from './dto/responses/class-students-leaderboard.-response.dto';
import { ClassLeaderboardResponseDto } from './dto/responses/class-leaderboard-response.dto';
import { Class } from '../classes/entities/class.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(TaskAttempt)
    private readonly taskAttemptRepository: Repository<TaskAttempt>,
  ) {}

  /**
   * Find leaderboard for all users based on their performance in the activity page
   */
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

  /**
   * Find leaderboard for all students in one class
   */
  async findClassStudentsLeaderboard(
    classId: string,
  ): Promise<ClassStudentsLeaderboardResponseDto[]> {
    const results = await this.taskAttemptRepository
      .createQueryBuilder('attempt')
      .leftJoin('attempt.student', 'student')
      .leftJoin('student.role', 'role')
      .select('student.user_id', 'id')
      .addSelect('student.name', 'name')
      .addSelect('student.username', 'username')
      .addSelect('student.image', 'image')
      .addSelect('student.level', 'level')
      .addSelect('student.xp', 'xp')
      .addSelect('COALESCE(SUM(attempt.points), 0)', 'point')
      .where('attempt.class_id = :classId', { classId })
      .andWhere('role.name = :role', { role: UserRole.STUDENT })
      .groupBy('student.user_id')
      .addGroupBy('student.name')
      .addGroupBy('student.username')
      .addGroupBy('student.image')
      .addGroupBy('student.level')
      .addGroupBy('student.xp')
      .orderBy('point', 'DESC')
      .addOrderBy('xp', 'DESC')
      .limit(50)
      .getRawMany();

    // Tambahkan rank (peringkat)
    return results.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
  }

  /**
   * Find leaderboard for all classes registered into the system
   */
  async findClassLeaderboard(): Promise<ClassLeaderboardResponseDto[]> {
    const results = await this.classRepository
      .createQueryBuilder('class')
      .leftJoin('class.taskAttempts', 'attempt')
      .select('class.class_id', 'id')
      .addSelect('class.name', 'name')
      .addSelect('class.image', 'image')
      .addSelect('COALESCE(SUM(attempt.points), 0)', 'point')
      .groupBy('class.class_id')
      .orderBy('point', 'DESC')
      .limit(50)
      .getRawMany();

    return results;
  }
}
