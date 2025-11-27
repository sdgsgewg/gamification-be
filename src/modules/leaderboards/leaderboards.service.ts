import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/enums/user-role.enum';
import { Class } from '../classes/entities/class.entity';
import { TaskAttempt } from '../task-attempts/entities/task-attempt.entity';
import { StudentLeaderboardResponseDto } from './dto/responses/student-leaderboard-response.dto';
import { FilterStudentLeaderboardDto } from './dto/requests/filter-student-leaderboard.dto';
import { LeaderboardScope } from './dto/enums/leaderboard-scope.enum';
import { ClassLeaderboardResponseDto } from './dto/responses/class-leaderboard-response.dto';

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
   * Find leaderboard for all students based on scope:
   * - GLOBAL   -> activity + class
   * - ACTIVITY -> only attempts where class_id IS NULL
   * - CLASS    -> only attempts where class_id IS NOT NULL
   */
  async findStudentLeaderboard(
    filterDto: FilterStudentLeaderboardDto,
  ): Promise<StudentLeaderboardResponseDto[]> {
    const scope = filterDto.scope || LeaderboardScope.GLOBAL;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .leftJoin('user.taskAttempts', 'attempt')
      .select('user.user_id', 'id')
      .addSelect('user.name', 'name')
      .addSelect('user.username', 'username')
      .addSelect('user.image', 'image')
      .addSelect('user.level', 'level')
      .addSelect('user.xp', 'xp')
      .addSelect('COALESCE(SUM(attempt.points), 0)', 'point')
      .where('role.name = :roleName', { roleName: UserRole.STUDENT });

    // Apply scope filter
    if (scope === LeaderboardScope.ACTIVITY) {
      query.andWhere('attempt.class_id IS NULL');
    } else if (scope === LeaderboardScope.CLASS) {
      query.andWhere('attempt.class_id IS NOT NULL');
    }

    query.groupBy('user.user_id');

    // ORDERING
    query
      .orderBy('point', 'DESC')
      .addOrderBy('user.xp', 'DESC')
      .addOrderBy('user.level', 'DESC')
      .addOrderBy('user.name', 'DESC');

    const rawResults = await query.limit(50).getRawMany();

    if (!rawResults.length) {
      throw new NotFoundException('No student leaderboard data found');
    }

    // Add rank and map to DTO
    const results: StudentLeaderboardResponseDto[] = rawResults.map(
      (user, index) => ({
        id: user.id,
        rank: index + 1,
        name: user.name,
        username: user.username,
        image: user.image,
        level: Number(user.level) || 0,
        xp: Number(user.xp) || 0,
        point: Number(user.point) || 0,
      }),
    );

    return results;
  }

  /**
   * Find leaderboard for all students in one class
   */
  async findClassStudentsLeaderboard(
    classId: string,
  ): Promise<StudentLeaderboardResponseDto[]> {
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
      .addOrderBy('level', 'DESC')
      .addOrderBy('name', 'DESC')
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
    const rawResults = await this.classRepository
      .createQueryBuilder('class')
      .leftJoin('class.taskAttempts', 'attempt')
      .select('class.class_id', 'id')
      .addSelect('class.name', 'name')
      .addSelect('class.image', 'image')
      .addSelect('COALESCE(SUM(attempt.points), 0)', 'point')
      .groupBy('class.class_id')
      .orderBy('point', 'DESC')
      .addOrderBy('name', 'DESC')
      .limit(50)
      .getRawMany();

    // Mapping ke DTO + rank
    const results: ClassLeaderboardResponseDto[] = rawResults.map(
      (cls, index) => ({
        id: cls.id,
        rank: index + 1,
        name: cls.name,
        image: cls.image,
        point: Number(cls.point) || 0,
      }),
    );

    return results;
  }
}
