import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { BaseResponseDto } from 'src/common/responses/base-response.dto';
import { getDbColumn } from 'src/common/database/get-db-column.util';
import { slugify } from 'src/common/utils/slug.util';
import { SlugHelper } from 'src/common/helpers/slug.helper';
import { FilterClassDto } from './dto/requests/filter-class.dto';
import { ClassOverviewResponseDto } from './dto/responses/class-overview-response.dto';
import { UserService } from '../users/users.service';
import { ClassDetailResponseDto } from './dto/responses/class-detail-response.dto';
import { CreateClassDto } from './dto/requests/create-class.dto';
import { UpdateClassDto } from './dto/requests/update-class.dto';
import { ClassMemberResponseDto } from './dto/responses/class-member-response.dto';
import { FilterClassMemberDto } from './dto/requests/filter-class-member.dto';
import { UserRole } from '../roles/enums/user-role.enum';
import { getResponseMessage } from 'src/common/utils/get-response-message.util';
import { ClassStudentService } from '../class-students/class-students.service';
import { ClassStudentOverviewResponseDto } from '../class-students/dto/responses/class-student-overview-reponse.dto';
import { MasterHistoryService } from '../master-history/master-history.service';
import { MasterHistoryTransactionType } from '../master-history/enums/master-history-transaction-type';
import { getMasterHistoryDescription } from 'src/common/utils/get-master-history-description.util';
import { ClassGradeService } from '../class-grades/class-grades.service';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    private readonly classGradeService: ClassGradeService,
    private readonly classStudentService: ClassStudentService,
    private readonly userService: UserService,
    private readonly masterHistoryService: MasterHistoryService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async findAllClasses(): Promise<ClassOverviewResponseDto[]> {
    const classes = await this.classRepository.find({
      relations: {
        classStudents: true,
      },
    });

    // Mapping hasil ke DTO
    const classOverviews: ClassOverviewResponseDto[] = classes.map((c) => ({
      id: c.class_id,
      name: c.name,
      slug: c.slug,
      image: c.image ?? null,
      studentCount: c.classStudents.length,
    }));

    return classOverviews;
  }

  async findUserClasses(
    userId: string,
    filterDto: FilterClassDto,
  ): Promise<ClassOverviewResponseDto[]> {
    // Dapatkan data user untuk tahu role-nya
    const user = await this.userService.findUserBy('id', userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Siapkan QueryBuilder berdasarkan role
    const qb = this.classRepository
      .createQueryBuilder('class')
      .leftJoin('class.classGrades', 'classGrade')
      .leftJoin('classGrade.grade', 'grade');

    if (user.role.name === UserRole.STUDENT) {
      // Untuk student → ambil class dari class_students
      qb.innerJoin('class.classStudents', 'classStudents').where(
        'classStudents.student_id = :userId',
        { userId },
      );
    } else if (user.role.name === UserRole.TEACHER) {
      // Untuk teacher → ambil class yang dia ajar
      qb.where('class.teacher_id = :userId', { userId });
    } else {
      // Role lain tidak punya akses
      throw new ForbiddenException(
        `Role ${user.role.name} tidak memiliki akses ke daftar kelas`,
      );
    }

    // Select and group by
    qb.select([
      'class.class_id AS "classId"',
      'class.name AS "name"',
      'class.slug AS "slug"',
      'class.image AS "image"',
      `STRING_AGG(DISTINCT REPLACE(grade.name, 'Kelas ', ''), ', ') AS "classGrade"`,
    ])
      .groupBy('class.class_id')
      .addGroupBy('class.name');

    // Filter pencarian (opsional)
    if (filterDto.searchText) {
      qb.andWhere('class.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }
    if (filterDto.gradeIds?.length) {
      qb.andWhere('classGrade.grade_id IN (:...gradeIds)', {
        gradeIds: filterDto.gradeIds,
      });
    }

    // Urutkan hasil (default: createdAt DESC)
    const orderBy = filterDto.orderBy ?? 'createdAt';
    const orderState = filterDto.orderState ?? 'DESC';
    const dbColumn = getDbColumn(Class, orderBy as keyof Class);
    qb.orderBy(`class.${dbColumn}`, orderState);

    // Eksekusi query
    const rawClasses = await qb.getRawMany();

    // Mapping hasil ke DTO
    const classOverviews: ClassOverviewResponseDto[] = rawClasses.map((c) => ({
      id: c.classId,
      name: c.name,
      slug: c.slug,
      image: c.image && c.image !== '' ? c.image : null,
      grade: c.classGrade,
    }));

    return classOverviews;
  }

  async findNotJoinedClasses(
    userId: string,
    filterDto: FilterClassDto,
  ): Promise<ClassOverviewResponseDto[]> {
    // Ambil user untuk validasi role
    const user = await this.userService.findUserBy('id', userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Hanya student yang relevan untuk query ini
    if (user.role.name !== UserRole.STUDENT) {
      throw new ForbiddenException(
        `Role ${user.role.name} tidak memiliki akses ke daftar kelas yang belum diikuti`,
      );
    }

    //  Siapkan QueryBuilder untuk ambil kelas yang belum diikuti student
    const qb = this.classRepository
      .createQueryBuilder('class')
      .leftJoin('class.classGrades', 'classGrade')
      .leftJoin('classGrade.grade', 'grade')
      .where(
        `class.class_id NOT IN (
        SELECT cs.class_id
        FROM class_students cs
        WHERE cs.student_id = :userId
      )`,
        { userId },
      );

    // Select + group by
    qb.select([
      'class.class_id AS "classId"',
      'class.name AS "name"',
      'class.slug AS "slug"',
      'class.image AS "image"',
      `STRING_AGG(DISTINCT REPLACE(grade.name, 'Kelas ', ''), ', ') AS "classGrade"`,
    ])
      .groupBy('class.class_id')
      .addGroupBy('class.name');

    // Filter pencarian (opsional)
    if (filterDto.searchText) {
      qb.where('class.name ILIKE :searchText', {
        searchText: `%${filterDto.searchText}%`,
      });
    }
    if (filterDto.gradeIds?.length) {
      qb.andWhere('classGrade.grade_id IN (:...gradeIds)', {
        gradeIds: filterDto.gradeIds,
      });
    }

    // Urutkan hasil (default: createdAt DESC)
    qb.orderBy('class.created_at', 'DESC');

    //  Eksekusi query
    const rawClasses = await qb.getRawMany();

    // Mapping ke DTO
    const classOverviews: ClassOverviewResponseDto[] = rawClasses.map((c) => ({
      id: c.classId,
      name: c.name,
      slug: c.slug,
      image: c.image || null,
      grade: c.classGrade,
    }));

    return classOverviews;
  }

  async findClassBySlug(classSlug: string): Promise<ClassDetailResponseDto> {
    // Ambil class berdasarkan slug
    const qb = this.classRepository
      .createQueryBuilder('class')
      .where('class.slug = :slug', { slug: classSlug });

    const classData = await qb.getOne();

    if (!classData) {
      throw new NotFoundException(`Class with slug ${classSlug} not found`);
    }

    const { class_id, name, slug, description, image } = classData;

    // Build DTO
    const classDetail: ClassDetailResponseDto = {
      id: class_id,
      name,
      slug,
      description,
      image: image !== '' ? image : null,
    };

    return classDetail;
  }

  async findClassMember(
    slug: string,
    filterDto: FilterClassMemberDto,
  ): Promise<ClassMemberResponseDto> {
    const classData = await this.classRepository.findOne({
      where: { slug },
      relations: {
        teacher: true,
      },
    });

    if (!classData) {
      throw new NotFoundException(`Class with slug ${slug} not found`);
    }

    const { class_id, teacher } = classData;

    // Ambil member (teacher + students)

    const classStudents: ClassStudentOverviewResponseDto[] =
      await this.classStudentService.findClassStudents(class_id);

    const member: ClassMemberResponseDto = {
      teacher: [
        {
          name: teacher?.name ?? '-',
          image: teacher?.image && teacher?.image !== '' ? teacher.image : null,
        },
      ],
      students: classStudents.map((student) => ({
        name: student.name,
        image: student.image !== '' ? student.image : null,
      })),
    };

    return member;
  }

  async createClass(
    userId: string,
    dto: CreateClassDto,
    imageFile?: Express.Multer.File,
  ): Promise<BaseResponseDto> {
    const slug = slugify(dto.name);

    // Cek apakah slug duplicate
    const isDuplicate = await SlugHelper.checkDuplicateSlug(
      this.classRepository,
      slug,
      'class_id',
    );

    if (isDuplicate) {
      return new BaseResponseDto(
        400,
        false,
        `Class with name "${dto.name}" has been registered`,
      );
    }

    let imageUrl = '';

    // Buat class baru
    const newClass = this.classRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      image: imageUrl,
      created_at: new Date(),
      created_by: dto.createdBy ?? null,
      teacher_id: dto.teacherId,
    });

    const savedClass = await this.classRepository.save(newClass);

    // Upload image jika ada file
    if (imageFile) {
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        savedClass.class_id,
        'classes',
        false,
      );

      imageUrl = uploadResult.url;

      await this.classRepository.update(savedClass.class_id, {
        image: imageUrl,
      });
      savedClass.image = imageUrl;
    }

    // Simpan ke class_grades
    if (dto.gradeIds && dto.gradeIds.length > 0) {
      await this.classGradeService.createClassGrades(
        savedClass.class_id,
        dto.gradeIds,
      );
    }

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'classes',
      pkName: 'class_id',
      pkValue: savedClass.class_id,
      transactionType: MasterHistoryTransactionType.INSERT,
      description: getMasterHistoryDescription(
        MasterHistoryTransactionType.INSERT,
        'class',
        undefined,
        savedClass,
      ),
      dataAfter: savedClass,
      createdBy: userId,
    });

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'class',
        action: 'create',
      }),
    };

    return response;
  }

  private async findClassOrThrow(id: string) {
    const qb = this.classRepository
      .createQueryBuilder('class')
      .where('class.class_id = :id', { id });

    const classData = await qb.getOne();

    if (!classData) {
      throw new NotFoundException(`Class with id ${id} not found`);
    }

    return classData;
  }

  async updateClass(
    id: string,
    userId: string,
    dto: UpdateClassDto,
    imageFile?: Express.Multer.File,
  ): Promise<BaseResponseDto> {
    // Cari mata pelajaran yang akan diupdate
    const existingClass = await this.findClassOrThrow(id);

    let imageUrl = existingClass.image;

    // Jika ada file baru, upload dan hapus file lama jika ada
    if (imageFile) {
      // Hapus file lama jika ada
      if (existingClass.image) {
        await this.fileUploadService.deleteImage(
          existingClass.image,
          'classes',
        );
      }

      // Convert Multer file to DTO
      const fileDto = this.fileUploadService.convertMulterFileToDto(imageFile);

      // Upload file baru
      const uploadResult = await this.fileUploadService.uploadImage(
        fileDto,
        existingClass.class_id,
        'classes',
        false,
      );

      imageUrl = uploadResult.url;
    }

    const slug = slugify(dto.name);

    // Cek apakah slug duplicate
    const isDuplicate = await SlugHelper.checkDuplicateSlug(
      this.classRepository,
      slug,
      'class_id',
      id,
    );

    if (isDuplicate) {
      return new BaseResponseDto(
        400,
        false,
        `Class with name "${dto.name}" has been registered`,
      );
    }

    // Update properti yang ada
    existingClass.name = dto.name;
    existingClass.slug = slug;
    existingClass.description = dto.description ?? null;
    existingClass.image = imageUrl;
    existingClass.updated_at = new Date();
    existingClass.updated_by = dto.updatedBy;

    // Simpan perubahan utama kelas
    const updatedClass = await this.classRepository.save(existingClass);

    const { class_id } = updatedClass;

    // Sinkronisasi relasi
    if (dto.gradeIds) {
      await this.classGradeService.syncClassGrades(class_id, dto.gradeIds);
    } else {
      await this.classGradeService.deleteClassGrades(class_id);
    }

    // Add event to master history
    await this.masterHistoryService.createMasterHistory({
      tableName: 'classes',
      pkName: 'class_id',
      pkValue: updatedClass.class_id,
      transactionType: MasterHistoryTransactionType.UPDATE,
      description: getMasterHistoryDescription(
        MasterHistoryTransactionType.UPDATE,
        'class',
        existingClass,
        updatedClass,
      ),
      dataBefore: existingClass,
      dataAfter: updatedClass,
      createdBy: userId,
    });

    const response: BaseResponseDto = {
      status: 200,
      isSuccess: true,
      message: getResponseMessage({
        entity: 'class',
        action: 'update',
      }),
    };

    return response;
  }
}
