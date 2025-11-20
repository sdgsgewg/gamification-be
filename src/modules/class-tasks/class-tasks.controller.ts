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
import { ClassTaskService } from './class-tasks.service';
import { ShareTaskIntoClassesDto } from './dto/requests/share-task-into-classes-request.dto';
import { FilterClassDto } from '../classes/dto/requests/filter-class.dto';
import { FilterTaskAttemptDto } from '../task-attempts/dto/requests/filter-task-attempt.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('class-tasks')
export class ClassTaskController {
  constructor(private readonly classTaskService: ClassTaskService) {}

  /**
   * [GET] /class-tasks
   * Mendapatkan daftar tugas (task) dari semua kelas dan grouped by date
   */
  @Get('')
  @UseGuards(JwtAuthGuard)
  async getTasksFromAllClasses(
    @Req() req: any,
    @Query() filterDto: FilterTaskAttemptDto,
  ) {
    const userId = req.user?.id || null;
    return this.classTaskService.findTasksFromAllClasses(userId, filterDto);
  }

  /**
   * [GET] /class-tasks/list
   * Mendapatkan daftar tugas (task) dari semua kelas
   */
  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getTasksFromAllClassesList(
    @Req() req: any,
    @Query() filterDto: FilterTaskAttemptDto,
  ) {
    const userId = req.user?.id || null;
    return this.classTaskService.findTasksFromAllClassesList(userId, filterDto);
  }

  /**
   * [GET] /classes/:classSlug/tasks/student
   * Mendapatkan daftar tugas (task) dari murid dalam satu kelas
   */
  @Get('classes/:classSlug/tasks/student')
  async getStudentClassTasks(
    @Param('classSlug') classSlug: string,
    @Req() req: any,
    @Query() filterDto: FilterClassTaskDto,
  ) {
    if (!classSlug) {
      throw new BadRequestException('Class slug is required');
    }
    const userId = req.user?.id || null;
    return this.classTaskService.findStudentClassTasks(
      classSlug,
      userId,
      filterDto,
    );
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
   * [GET] /attempts/:id/summary
   * Mendapatkan ringkasan attempt terakhir yang sudah completed
   */
  @Get('attempts/:id/summary')
  // @UseGuards(JwtAuthGuard)
  async getClassTaskSummary(@Param('id') attemptId: string) {
    if (!attemptId) {
      throw new BadRequestException('Attempt id is required');
    }
    return this.classTaskService.findClassTaskSummaryFromAttempt(attemptId);
  }

  /**
   * [GET] /class-tasks/available-classes/:taskId
   * Mendapatkan daftar kelak yang dapat dibagikan untuk satu tugas
   */
  @Get('available-classes/:taskId')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  async shareTaskIntoClasses(
    @Body() dto: ShareTaskIntoClassesDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || null;
    return this.classTaskService.shareTaskIntoClasses(dto, userId);
  }
}
