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
import { FilterTaskAttemptAnalyticsDto } from './dto/requests/filter-task-attempt-analytics.dto';
import { FilterStudentRecentAttemptDto } from './dto/requests/filter-student-recent-attempt.dto';

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
   * [GET] /recent-attempts
   * Get recent attempts by user (student)
   */
  @Get('/recent-attempts')
  @UseGuards(JwtAuthGuard)
  async getStudentRecentAttempts(
    @Query() filterDto: FilterStudentRecentAttemptDto,
    @Req() req: any,
  ) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.taskAttemptService.findStudentRecentAttempts(userId, filterDto);
  }

  /**
   * [GET] /analytics
   * Get all task attempts from each teacher's classes or activity page
   */
  @Get('/analytics')
  @UseGuards(JwtAuthGuard)
  async getAllTaskAttemptsAnalytics(
    @Query() filterDto: FilterTaskAttemptAnalyticsDto,
    @Req() req: any,
  ) {
    const teacherId = req.user?.id || null;
    return this.taskAttemptService.findAllTaskAttemptsAnalytics(
      teacherId,
      filterDto,
    );
  }

  /**
   * [GET] /analytics/student/:classSlug/:taskSlug
   * Get student attempts from a task in a class or activity page
   */
  @Get('/analytics/student/:classSlug/:taskSlug')
  @UseGuards(JwtAuthGuard)
  async getStudentTaskAttemptDetailAnalytics(
    @Param('classSlug') classSlug: string,
    @Param('taskSlug') taskSlug: string,
    @Query() filterDto: FilterTaskAttemptAnalyticsDto,
    @Req() req: any,
  ) {
    const studentId = req.user?.id || null;
    return this.taskAttemptService.findStudentTaskAttemptDetailAnalytics(
      studentId,
      classSlug,
      taskSlug,
      filterDto,
    );
  }

  @Get('/analytics/student/:taskSlug')
  @UseGuards(JwtAuthGuard)
  async getStudentTaskAttemptDetailAnalyticsByTask(
    @Param('taskSlug') taskSlug: string,
    @Query() filterDto: FilterTaskAttemptAnalyticsDto,
    @Req() req: any,
  ) {
    const studentId = req.user?.id || null;
    return this.taskAttemptService.findStudentTaskAttemptDetailAnalytics(
      studentId,
      null,
      taskSlug,
      filterDto,
    );
  }

  /**
   * [GET] /analytics/student
   * Get all task attempts from student on class or activity page
   */
  @Get('/analytics/student')
  @UseGuards(JwtAuthGuard)
  async getStudentTaskAttemptsAnalytics(
    @Query() filterDto: FilterTaskAttemptAnalyticsDto,
    @Req() req: any,
  ) {
    const studentId = req.user?.id || null;
    return this.taskAttemptService.findStudentTaskAttemptsAnalytics(
      studentId,
      filterDto,
    );
  }

  /**
   * [GET] /analytics/:classSlug/:taskSlug
   * Get student attempts from a task in a class or activity page
   */
  @Get('/analytics/:classSlug/:taskSlug')
  async getTaskAttemptDetailAnalytics(
    @Param('classSlug') classSlug: string,
    @Param('taskSlug') taskSlug: string,
    @Query() filterDto: FilterTaskAttemptAnalyticsDto,
  ) {
    return this.taskAttemptService.findTaskAttemptDetailAnalytics(
      classSlug,
      taskSlug,
      filterDto,
    );
  }

  @Get('/analytics/:taskSlug')
  async getTaskAttemptDetailAnalyticsByTask(
    @Param('taskSlug') taskSlug: string,
    @Query() filterDto: FilterTaskAttemptAnalyticsDto,
  ) {
    return this.taskAttemptService.findTaskAttemptDetailAnalytics(
      null,
      taskSlug,
      filterDto,
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
    return this.taskAttemptService.createActivityTaskAttempt(dto);
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
    return this.taskAttemptService.updateActivityTaskAttempt(id, dto);
  }

  @Put('class/:id')
  async updateClassTaskAttempt(
    @Param('id') id: string,
    @Body() dto: UpdateTaskAttemptDto,
  ) {
    return this.taskAttemptService.updateClassTaskAttempt(id, dto);
  }
}
