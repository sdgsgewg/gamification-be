import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FilterUserDto } from './dto/requests/filter-user.dto';
import { UserOverviewResponseDto } from './dto/responses/user-overview-response.dto';
import { UserDetailResponseDto } from './dto/responses/user-detail-response.dto';
import { getDateTime } from 'src/common/utils/date-modifier.util';
import { CreateUserDto } from 'src/auth/dto/requests/create-user.dto';
import { RoleService } from '../roles/roles.service';
import { LevelHelper } from 'src/common/helpers/level.helper';
import { UserStatsResponseDto } from './dto/responses/user-stats-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly roleService: RoleService,
  ) {}

  async findAllUsers(
    filterDto: FilterUserDto,
  ): Promise<UserOverviewResponseDto[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .leftJoin('user.grade', 'grade')
      .select([
        'user.user_id AS "userId"',
        'user.name AS "name"',
        'user.username AS "username"',
        'user.email AS "email"',
        'user.gender AS "gender"',
        'user.phone AS "phone"',
        'user.dob AS "dob"',
        'role.name AS "role"',
        'grade.name AS "grade"',
        'user.level AS "level"',
        'user.xp AS "xp"',
        'user.emailVerifiedAt AS "emailVerifiedAt"',
        'user.createdAt AS "createdAt"',
      ]);

    if (filterDto.searchText) {
      qb.andWhere('user.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }

    const rawUsers = await qb.getRawMany();

    const userOverviews: UserOverviewResponseDto[] = rawUsers.map((u) => ({
      userId: u.userId,
      name: u.name,
      username: u.username,
      email: u.email,
      gender: u.gender,
      phone: u.phone,
      dob: u.dob,
      role: u.role,
      grade: u.grade,
      level: u.level,
      xp: u.xp,
      emailVerifiedAt: u.emailVerifiedAt,
      createdAt: u.createdAt,
    }));

    return userOverviews;
  }

  private getUserDetailData(userWithRelations: User): UserDetailResponseDto {
    const data: UserDetailResponseDto = {
      userId: userWithRelations.user_id,
      name: userWithRelations.name,
      username: userWithRelations.username,
      email: userWithRelations.email,
      password: userWithRelations.password,
      gender: userWithRelations.gender,
      phone: userWithRelations.phone,
      dob: `${getDateTime(userWithRelations.dob)}`,
      image: userWithRelations.image ?? null,
      role: userWithRelations.role
        ? {
            roleId: userWithRelations.role.role_id,
            name: userWithRelations.role.name,
          }
        : null,
      grade: userWithRelations.grade
        ? {
            gradeId: userWithRelations.grade.grade_id,
            name: userWithRelations.grade.name,
          }
        : null,
      level: userWithRelations.level,
      xp: userWithRelations.xp,
      emailVerifiedAt: `${getDateTime(userWithRelations.email_verified_at)}`,
      createdAt: `${getDateTime(userWithRelations.created_at)}`,
    };

    return data;
  }

  async findUserBy(
    field: 'id' | 'email' | 'username',
    value: string,
  ): Promise<UserDetailResponseDto> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.grade', 'grade');

    if (field === 'id') {
      qb.where('user.user_id = :value', { value });
    } else if (field === 'email') {
      qb.where('user.email = :value', { value });
    } else if (field === 'username') {
      qb.where('user.username = :value', { value });
    }

    const user = await qb.getOne();

    if (!user) {
      // throw new NotFoundException(`User with ${field} ${value} not found`);
      return null;
    }

    return this.getUserDetailData(user);
  }

  async findUserStats(userId: string): Promise<UserStatsResponseDto> {
    const user = await this.userRepository.findOne({
      where: {
        user_id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} $ not found`);
    }

    const { user_id, level, xp } = user;
    const nextLvlMinXp = LevelHelper.getTotalXpForLevel(level + 1);
    const xpProgress = LevelHelper.getXpProgress(xp, nextLvlMinXp);

    const data: UserStatsResponseDto = {
      id: user_id,
      level,
      currXp: xp,
      nextLvlMinXp,
      xpProgress,
    };

    return data;
  }

  async createUser(dto: CreateUserDto): Promise<UserDetailResponseDto> {
    const { email, password: hashedPassword, roleId } = dto;

    const choosenRole = await this.roleService.findRoleBy('id', roleId);

    const roleName = choosenRole.name;

    let user = null;

    if (roleName === 'Student') {
      user = this.userRepository.create({
        email,
        password: hashedPassword,
        role_id: roleId,
        level: 1,
        xp: 0,
        created_at: new Date(),
      });
    } else if (roleName === 'Teacher') {
      user = this.userRepository.create({
        email,
        password: hashedPassword,
        role_id: roleId,
        created_at: new Date(),
      });
    }

    const savedUser = await this.userRepository.save(user);

    // Query ulang untuk ambil subject + grades
    const userWithRelations = await this.userRepository.findOne({
      where: { user_id: savedUser.user_id },
      relations: ['role', 'grade'],
    });

    return this.getUserDetailData(userWithRelations);
  }

  async findUserOrThrow(id: string) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.user_id = :id', { id });

    const user = await qb.getOne();

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async updateEmailVerifiedAt(userId: string): Promise<void> {
    await this.userRepository.update(
      { user_id: userId },
      { email_verified_at: new Date() },
    );
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(
      { user_id: userId },
      { password: hashedPassword },
    );
  }

  async updateProfile(
    userId: string,
    name: string,
    username: string,
    gradeId?: string,
  ): Promise<void> {
    // Pastikan username unik (cek user lain)
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser && existingUser.user_id !== userId) {
      throw new BadRequestException('Username sudah digunakan');
    }

    await this.userRepository.update(
      { user_id: userId },
      {
        name,
        username,
        grade_id: gradeId ?? null,
      },
    );
  }

  async updateLevelAndXp(userId: string, xpGained: number): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (!existingUser) throw new Error('User not found');

    const { newLevel, newXp } = LevelHelper.getUserLevel(
      existingUser.level,
      existingUser.xp,
      xpGained,
    );

    existingUser.level = newLevel;
    existingUser.xp = newXp;
    await this.userRepository.save(existingUser);
  }
}
