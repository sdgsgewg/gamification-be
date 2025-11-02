import { Controller, Post, Put, Param, Body } from '@nestjs/common';
import { TaskAttemptService } from './task-attempts.service';
import { CreateTaskAttemptDto } from './dto/requests/create-task-attempt.dto';
import { UpdateTaskAttemptDto } from './dto/requests/update-task-attempt.dto';

@Controller('/task-attempts')
export class TaskAttemptController {
  constructor(private readonly taskAttemptService: TaskAttemptService) {}

  @Post()
  async create(@Body() dto: CreateTaskAttemptDto) {
    return this.taskAttemptService.createTaskAttempt(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskAttemptDto) {
    return this.taskAttemptService.updateTaskAttempt(id, dto);
  }
}
