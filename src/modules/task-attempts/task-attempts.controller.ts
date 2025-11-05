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
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('/task-attempts')
export class TaskAttemptController {
  constructor(private readonly taskAttemptService: TaskAttemptService) {}

  @Get('')
  @UseGuards(OptionalJwtAuthGuard)
  async getAllTaskAttemptsByUser(
    @Query() filterDto: FilterTaskAttemptDto,
    @Req() req: any,
  ) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.taskAttemptService.findAllTaskAttemptsbyUser(userId, filterDto);
  }

  @Get(':id')
  async getTaskAttemptDetail(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Task attempt id is required');
    }
    return this.taskAttemptService.findTaskAttemptById(id);
  }

  @Post()
  async create(@Body() dto: CreateTaskAttemptDto) {
    return this.taskAttemptService.createTaskAttempt(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskAttemptDto) {
    return this.taskAttemptService.updateTaskAttempt(id, dto);
  }
}
