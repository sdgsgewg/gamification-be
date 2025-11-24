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
import { UserRecentActivityResponse } from './dto/responses/user-recent-activity-response.dto';
import { MasterHistoryService } from '../master-history/master-history.service';
import { ActivityLogService } from '../activty-logs/activity-logs.service';
import { UserRole } from '../roles/enums/user-role.enum';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { UpdateUserDto } from './dto/requests/update-user.dto';
import { MasterHistoryTransactionType } from '../master-history/enums/master-history-transaction-type';
import { getMasterHistoryDescription } from 'src/common/utils/get-master-history-description.util';
import { UserSession } from '../user-sessions/entities/user-sessions.entity';
import { UserLastLoginResponseDto } from './dto/responses/user-last-login-response.dto';
import { UserRoleCountResponseDto } from './dto/responses/user-role-count-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    private readonly roleService: RoleService,
    private readonly masterHistoryService: MasterHistoryService,
    private readonly activityLogService: ActivityLogService,
    private readonly fileUploadService: FileUploadService,
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
        'user.email_verified_at AS "emailVerifiedAt"',
        'user.created_at AS "createdAt"',
      ]);

    if (filterDto.searchText) {
      qb.andWhere('user.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }

    if (filterDto.role) {
      qb.andWhere('role.name = :role', {
        role: filterDto.role,
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

  async findUserRoleCounts(): Promise<UserRoleCountResponseDto> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role');

    const raw = await qb
      .select([
        'COUNT(*) AS "totalUsers"',
        `COUNT(CASE WHEN role.name = '${UserRole.ADMIN}' THEN 1 END) AS "totalAdmins"`,
        `COUNT(CASE WHEN role.name = '${UserRole.TEACHER}' THEN 1 END) AS "totalTeachers"`,
        `COUNT(CASE WHEN role.name = '${UserRole.STUDENT}' THEN 1 END) AS "totalStudents"`,
      ])
      .getRawOne();

    return {
      totalUsers: Number(raw.totalUsers),
      totalAdmins: Number(raw.totalAdmins),
      totalTeachers: Number(raw.totalTeachers),
      totalStudents: Number(raw.totalStudents),
    };
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
      dob: userWithRelations.dob ?? null,
      image:
        userWithRelations.image && userWithRelations.image !== ''
          ? userWithRelations.image
          : null,
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

  async findUserLastLogin(userId: string): Promise<UserLastLoginResponseDto> {
    const lastSession = await this.userSessionRepository.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    const { user_id, device_info, created_at } = lastSession;

    const data: UserLastLoginResponseDto = {
      id: user_id,
      deviceInfo: device_info,
      lastLoginAt: getDateTime(created_at),
    };

    return data;
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

    if (roleName === UserRole.STUDENT) {
      user = this.userRepository.create({
        email,
        password: hashedPassword,
        role_id: roleId,
        level: 1,
        xp: 0,
        created_at: new Date(),
      });
    } else if (roleName === UserRole.TEACHER) {
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
    dto: UpdateUserDto,
    imageFile?: Express.Multer.File,
  ): Promise<BaseResponseDto> {
    // Pastikan username unik (cek user lain)
    const existingUserByUsername = await this.userRepository.findOne({
      where: { username: dto.username },
    });

    if (existingUserByUsername && existingUserByUsername.user_id !== userId) {
      return new BaseResponseDto(
        400,
        false,
        `User with username "${dto.username}" is already registered.`,
      );
    }

    const existingUser = await this.userRepository.findOne({
      where: { user_id: userId },
    });

    let imageUrl = existingUser.image;

    // Jika ada file baru, upload dan hapus file lama jika ada
    if (imageFile) {
      // Hapus file lama jika ada
      if (existingUser.image) {
        await this.fileUploadService.deleteImage(existingUser.image, 'users');
      }

      // Convert Multer file to DTO
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      // Upload file baru
      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        existingUser.user_id,
        'users',
        false,
      );

      imageUrl = uploadResult.url;
    }

    // Update properti yang ada
    existingUser.name = dto.name;
    existingUser.username = dto.username;
    existingUser.gender = dto.gender;
    existingUser.phone = dto.phone;
    existingUser.dob = dto.dob ?? null;
    existingUser.image = imageUrl;
    existingUser.updateAt = new Date();

    // Simpan perubahan utama user
    const updatedUser = await this.userRepository.save(existingUser);

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'users',
      pkName: 'user_id',
      pkValue: updatedUser.user_id,
      transactionType: MasterHistoryTransactionType.UPDATE,
      description: `You updated your profile.`,
      dataBefore: existingUser,
      dataAfter: updatedUser,
      createdBy: userId,
    });

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: 'Profile has been updated!',
    };

    return response;
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

  async findUserRecentActivities(
    userId: string,
  ): Promise<UserRecentActivityResponse[]> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      relations: {
        role: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const userMasterHistories =
      await this.masterHistoryService.findUserMasterHistory(userId);
    const userActivityLogs = await this.activityLogService.findUserActivityLogs(
      userId,
      user.role.name,
    );

    const userRecentActivities = userMasterHistories.concat(userActivityLogs);

    const response: UserRecentActivityResponse[] = userRecentActivities;

    return response;
  }
}
