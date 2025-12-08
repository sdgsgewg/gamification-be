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

  @Get('popular')
  @UseGuards(JwtAuthGuard)
  async getMostPopularTask(@Req() req: any) {
    const creatorId = req.user?.id || null;
    return this.taskAttemptService.findMostPopularTask(creatorId);
  }

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
