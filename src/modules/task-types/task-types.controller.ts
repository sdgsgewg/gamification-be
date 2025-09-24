import {
  Controller,
  Query,
  Get,
  Post,
  Put,
  Delete,
  Param,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { TaskTypeService } from './task-types.service';
import { FilterTaskTypeDto } from './dto/requests/filter-task-type.dto';
import { CreateTaskTypeDto } from './dto/requests/create-task-type.dto';
import { UpdateTaskTypeDto } from './dto/requests/update-task-type.dto';

@Controller('/task-types')
export class TaskTypeController {
  constructor(private readonly taskTypeService: TaskTypeService) {}

  @Get('')
  async getAllTaskTypes(@Query() filterDto: FilterTaskTypeDto) {
    return this.taskTypeService.findAllTaskTypes(filterDto);
  }

  @Get(':slug')
  async getTaskTypeDetail(@Param('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Task Type slug is required');
    }
    return this.taskTypeService.findTaskTypeBySlug(slug);
  }

  @Post()
  async create(@Body() dto: CreateTaskTypeDto) {
    return this.taskTypeService.createTaskType(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskTypeDto) {
    return this.taskTypeService.updateTaskType(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.taskTypeService.deleteTaskType(id);
  }
}
