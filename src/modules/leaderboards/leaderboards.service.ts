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
import { LevelHelper } from 'src/common/helpers/level.helper';

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
   * ================================
   * STUDENT LEADERBOARD (GLOBAL / ACTIVITY / CLASS)
   * Rule:
   * - Points = SUM(best attempt per task)
   * - XP & Level = tie breaker only
   * ================================
   */
  async findStudentLeaderboard(
    filterDto: FilterStudentLeaderboardDto,
  ): Promise<StudentLeaderboardResponseDto[]> {
    const scope = filterDto.scope || LeaderboardScope.GLOBAL;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .where('role.name = :roleName', { roleName: UserRole.STUDENT })

      .select('user.user_id', 'id')
      .addSelect('user.name', 'name')
      .addSelect('user.username', 'username')
      .addSelect('user.image', 'image')

      // ======================
      // TOTAL XP
      // ======================
      .addSelect((qb) => {
        return qb
          .subQuery()
          .select('COALESCE(SUM(ta.xp_gained), 0)')
          .from(TaskAttempt, 'ta')
          .where('ta.student_id = user.user_id');
      }, 'xp')

      // ======================
      // TOTAL POINT (BEST ATTEMPT PER TASK)
      // ======================
      .addSelect((qb) => {
        const sub = qb
          .subQuery()
          .select('SUM(best.points)')
          .from((qb2) => {
            const inner = qb2
              .subQuery()
              .select('MAX(a.points)', 'points')
              .addSelect('a.task_id', 'task_id')
              .from(TaskAttempt, 'a')
              .where('a.student_id = user.user_id');

            if (scope === LeaderboardScope.ACTIVITY) {
              inner.andWhere('a.class_id IS NULL');
            } else if (scope === LeaderboardScope.CLASS) {
              inner.andWhere('a.class_id IS NOT NULL');
            }

            inner.groupBy('a.task_id');
            return inner;
          }, 'best');

        return sub;
      }, 'point')

      .orderBy('point', 'DESC')
      .addOrderBy('xp', 'DESC')
      .addOrderBy('name', 'ASC')
      .limit(50);

    const rawResults = await query.getRawMany();

    if (!rawResults.length) {
      throw new NotFoundException('No student leaderboard data found');
    }

    return rawResults.map((row, index) => {
      const xp = Number(row.xp) || 0;

      let level = 1;
      while (xp >= LevelHelper.getTotalXpForLevel(level + 1)) {
        level++;
      }

      return {
        id: row.id,
        rank: index + 1,
        name: row.name,
        username: row.username,
        image: row.image,
        xp,
        level,
        point: Number(row.point) || 0,
      };
    });
  }

  /**
   * ================================
   * CLASS STUDENT LEADERBOARD
   * Rule:
   * - Best attempt per task per student (inside class)
   * ================================
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

      // ======================
      // TOTAL XP
      // ======================
      .addSelect('COALESCE(SUM(attempt.xp_gained), 0)', 'xp')

      // ======================
      // TOTAL POINT
      // ======================
      .addSelect('SUM(best.points)', 'point')

      .innerJoin(
        (qb) =>
          qb
            .select('MAX(a.points)', 'points')
            .addSelect('a.task_id', 'task_id')
            .addSelect('a.student_id', 'student_id')
            .from(TaskAttempt, 'a')
            .where('a.class_id = :classId', { classId })
            .groupBy('a.task_id')
            .addGroupBy('a.student_id'),
        'best',
        'best.student_id = student.user_id AND best.task_id = attempt.task_id',
      )

      .where('attempt.class_id = :classId', { classId })
      .andWhere('role.name = :role', { role: UserRole.STUDENT })

      .groupBy('student.user_id')
      .addGroupBy('student.name')
      .addGroupBy('student.username')
      .addGroupBy('student.image')

      .orderBy('point', 'DESC')
      .addOrderBy('xp', 'DESC')
      .addOrderBy('name', 'ASC')
      .limit(50)
      .getRawMany();

    return results.map((row, index) => {
      const xp = Number(row.xp) || 0;

      let level = 1;
      while (xp >= LevelHelper.getTotalXpForLevel(level + 1)) {
        level++;
      }

      return {
        id: row.id,
        rank: index + 1,
        name: row.name,
        username: row.username,
        image: row.image,
        xp,
        level,
        point: Number(row.point) || 0,
      };
    });
  }

  /**
   * ================================
   * CLASS LEADERBOARD
   * Rule:
   * - SUM(best attempt per task per student)
   * ================================
   */
  async findClassLeaderboard(): Promise<ClassLeaderboardResponseDto[]> {
    const rawResults = await this.classRepository
      .createQueryBuilder('class')
      .leftJoin('class.taskAttempts', 'attempt')
      .select('class.class_id', 'id')
      .addSelect('class.name', 'name')
      .addSelect('class.image', 'image')
      .addSelect('COALESCE(SUM(best.points), 0)', 'point')
      .innerJoin(
        (qb) =>
          qb
            .select('MAX(a.points)', 'points')
            .addSelect('a.task_id', 'task_id')
            .addSelect('a.class_id', 'class_id')
            .from(TaskAttempt, 'a')
            .where('a.class_id IS NOT NULL')
            .groupBy('a.task_id')
            .addGroupBy('a.class_id'),
        'best',
        'best.class_id = class.class_id',
      )
      .groupBy('class.class_id')
      .addGroupBy('class.name')
      .addGroupBy('class.image')
      .orderBy('point', 'DESC')
      .addOrderBy('name', 'ASC')
      .limit(50)
      .getRawMany();

    return rawResults.map((cls, index) => ({
      id: cls.id,
      rank: index + 1,
      name: cls.name,
      image: cls.image,
      point: Number(cls.point) || 0,
    }));
  }
}
