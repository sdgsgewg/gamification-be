import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { TaskAttemptService } from './task-attempts.service';
import { CreateTaskAttemptDto } from './dto/requests/create-task-attempt.dto';
import { UpdateTaskAttemptDto } from './dto/requests/update-task-attempt.dto';
import { FilterTaskAttemptDto } from './dto/requests/filter-task-attempt.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('/task-attempts')
export class TaskAttemptController {
  constructor(private readonly taskAttemptService: TaskAttemptService) {}

  /**
   * [GET] /
   * Get all task attempts by user (student) with optional filters
   */
  @Get('')
  @UseGuards(JwtAuthGuard)
  async getAllTaskAttemptsByUser(
    @Query() filterDto: FilterTaskAttemptDto,
    @Req() req: any,
  ) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.taskAttemptService.findAllTaskAttemptsByUser(userId, filterDto);
  }

  /**
   * [GET] /popular
   * Get most popular tasks created by the creator (teacher/admin)
   */
  @Get('popular')
  @UseGuards(JwtAuthGuard)
  async getMostPopularTask(@Req() req: any) {
    const creatorId = req.user?.id || null;
    return this.taskAttemptService.findMostPopularTask(creatorId);
  }

  /**
   * [GET] /class
   * Get all task attempts from each teacher's classes
   */
  @Get('/class')
  @UseGuards(JwtAuthGuard)
  async getAllTaskAttemptsFromClasses(@Req() req: any) {
    const teacherId = req.user?.id || null;
    return this.taskAttemptService.findAllTaskAttemptsFromClasses(teacherId);
  }

  /**
   * [GET] /activity
   * Get all task attempts from each task on activity page
   */
  @Get('/activity')
  @UseGuards(JwtAuthGuard)
  async getAllTaskAttemptsFromActivityPage(@Req() req: any) {
    const teacherId = req.user?.id || null;
    return this.taskAttemptService.findAllTaskAttemptsFromActivityPage(
      teacherId,
    );
  }

  /**
   * [GET] /class/:classSlug/:taskSlug
   * Get student attempts from a task in a class
   */
  @Get('/class/:classSlug/:taskSlug')
  async getStudentAttemptsFromClassTask(
    @Param('classSlug') classSlug: string,
    @Param('taskSlug') taskSlug: string,
  ) {
    return this.taskAttemptService.findStudentAttemptsFromClassTask(
      classSlug,
      taskSlug,
    );
  }

  /**
   * [GET] /activity/:taskSlug
   * Get student attempts from a task on activity page
   */
  @Get('/activity/:taskSlug')
  async getStudentAttemptsFromActivityTask(
    @Param('taskSlug') taskSlug: string,
  ) {
    return this.taskAttemptService.findStudentAttemptsFromActivityTask(
      taskSlug,
    );
  }

  /**
   * [GET] /:id
   * Get task attempt detail by id
   */
  @Get(':id')
  async getTaskAttemptDetail(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Task attempt id is required');
    }
    return this.taskAttemptService.findTaskAttemptById(id);
  }

  @Post('activity')
  async createActivityAttempt(@Body() dto: CreateTaskAttemptDto) {
    return this.taskAttemptService.createTaskAttempt(dto);
  }

  @Post('class')
  async createClassTaskAttempt(@Body() dto: CreateTaskAttemptDto) {
    return this.taskAttemptService.createClassTaskAttempt(dto);
  }

  @Put('activity/:id')
  async updateActivityAttempt(
    @Param('id') id: string,
    @Body() dto: UpdateTaskAttemptDto,
  ) {
    return this.taskAttemptService.updateTaskAttempt(id, dto);
  }

  @Put('class/:id')
  async updateClassTaskAttempt(
    @Param('id') id: string,
    @Body() dto: UpdateTaskAttemptDto,
  ) {
    return this.taskAttemptService.updateClassTaskAttempt(id, dto);
  }
}
