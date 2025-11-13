import {
  BadRequestException,
  Controller,
  Query,
  Param,
  Req,
  Get,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { FilterClassTaskDto } from './dto/requests/filter-class-task.dto';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { ClassTaskService } from './class-tasks.service';
import { ShareTaskIntoClassesDto } from './dto/requests/share-task-into-classes-request.dto';
import { FilterClassDto } from '../classes/dto/requests/filter-class.dto';
import { FilterTaskAttemptDto } from '../task-attempts/dto/requests/filter-task-attempt.dto';

@Controller('class-tasks')
export class ClassTaskController {
  constructor(private readonly classTaskService: ClassTaskService) {}

  /**
   * [GET] /class-tasks
   * Mendapatkan daftar tugas (task) dari semua kelas
   */
  @Get('')
  @UseGuards(OptionalJwtAuthGuard)
  async getTasksFromAllClasses(
    @Req() req: any,
    @Query() filterDto: FilterTaskAttemptDto,
  ) {
    const userId = req.user?.id || null;
    return this.classTaskService.findTasksFromAllClasses(userId, filterDto);
  }

  /**
   * [GET] /classes/:classSlug/tasks/student
   * Mendapatkan daftar tugas (task) dari murid dalam satu kelas
   */
  @Get('classes/:classSlug/tasks/student')
  async getStudentClassTasks(
    @Param('classSlug') classSlug: string,
    @Query() filterDto: FilterClassTaskDto,
  ) {
    if (!classSlug) {
      throw new BadRequestException('Class slug is required');
    }

    return this.classTaskService.findStudentClassTasks(classSlug, filterDto);
  }

  /**
   * [GET] /classes/:classSlug/tasks/teacher
   * Mendapatkan daftar tugas (task) dari guru dalam satu kelas
   */
  @Get('classes/:classSlug/tasks/teacher')
  async getTeacherClassTasks(
    @Param('classSlug') classSlug: string,
    @Query() filterDto: FilterClassTaskDto,
  ) {
    if (!classSlug) {
      throw new BadRequestException('Class slug is required');
    }

    return this.classTaskService.findTeacherClassTasks(classSlug, filterDto);
  }

  /**
   * [GET] /classes/:classSlug/tasks/:taskSlug
   * Mendapatkan detail satu task (tanpa pertanyaan)
   */
  @Get('classes/:classSlug/tasks/:taskSlug')
  @UseGuards(OptionalJwtAuthGuard)
  async getClassTaskDetail(
    @Param('classSlug') classSlug: string,
    @Param('taskSlug') taskSlug: string,
    @Req() req: any,
  ) {
    if (!classSlug || !taskSlug) {
      throw new BadRequestException('Class slug and Task slug are required');
    }

    const userId = req.user?.id || null;
    return this.classTaskService.findClassTaskBySlug(
      classSlug,
      taskSlug,
      userId,
    );
  }

  /**
   * [GET] /classes/:classSlug/tasks/:taskSlug/attempt
   * Mendapatkan detail task + pertanyaan (jika user login, sertakan jawaban terakhir)
   */
  @Get('classes/:classSlug/tasks/:taskSlug/attempt')
  @UseGuards(OptionalJwtAuthGuard)
  async getClassTaskWithQuestions(
    @Param('classSlug') classSlug: string,
    @Param('taskSlug') taskSlug: string,
    @Req() req: any,
  ) {
    if (!classSlug || !taskSlug) {
      throw new BadRequestException('Class slug and Task slug are required');
    }

    const userId = req.user?.id || null;
    return this.classTaskService.findClassTaskWithQuestions(
      classSlug,
      taskSlug,
      userId,
    );
  }

  /**
   * [GET] /classes/:classSlug/tasks/:taskSlug/summary
   * Mendapatkan ringkasan attempt terakhir yang sudah completed
   */
  @Get('classes/:classSlug/tasks/:taskSlug/summary')
  @UseGuards(OptionalJwtAuthGuard)
  async getClassTaskSummary(
    @Param('classSlug') classSlug: string,
    @Param('taskSlug') taskSlug: string,
    @Req() req: any,
  ) {
    if (!classSlug || !taskSlug) {
      throw new BadRequestException('Class slug and Task slug are required');
    }

    const userId = req.user?.id || null;

    return this.classTaskService.findClassTaskSummaryFromAttempt(
      classSlug,
      taskSlug,
      userId,
    );
  }

  /**
   * [GET] /class-tasks/available-classes/:taskId
   * Mendapatkan daftar kelak yang dapat dibagikan untuk satu tugas
   */
  @Get('available-classes/:taskId')
  @UseGuards(OptionalJwtAuthGuard)
  async getAvailableClasses(
    @Param('taskId') id: string,
    @Query() filterDto: FilterClassDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || null;
    return this.classTaskService.findAvailableClasses(id, userId, filterDto);
  }

  /**
   * [POST] /class-tasks
   * Membagikan tugas ke kelas yang sudah dipilih
   */
  @Post()
  async shareTaskIntoClasses(@Body() dto: ShareTaskIntoClassesDto) {
    return this.classTaskService.shareTaskIntoClasses(dto);
  }
}
