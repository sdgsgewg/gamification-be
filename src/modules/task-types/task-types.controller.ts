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
  UseGuards,
  Req,
} from '@nestjs/common';
import { TaskTypeService } from './task-types.service';
import { FilterTaskTypeDto } from './dto/requests/filter-task-type.dto';
import { CreateTaskTypeDto } from './dto/requests/create-task-type.dto';
import { UpdateTaskTypeDto } from './dto/requests/update-task-type.dto';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('/task-types')
export class TaskTypeController {
  constructor(private readonly taskTypeService: TaskTypeService) {}

  @Get('')
  async getAllTaskTypes(@Query() filterDto: FilterTaskTypeDto) {
    return this.taskTypeService.findAllTaskTypes(filterDto);
  }

  @Get(':id')
  async getTaskTypeById(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Task Type id is required');
    }
    return this.taskTypeService.findTaskTypeBy('id', id);
  }

  @Get(':slug')
  async getTaskTypeBySlug(@Param('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Task Type slug is required');
    }
    return this.taskTypeService.findTaskTypeBy('slug', slug);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(@Body() dto: CreateTaskTypeDto, @Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.taskTypeService.createTaskType(userId, dto);
  }

  @Put(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskTypeDto,
    @Req() req: any,
  ) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.taskTypeService.updateTaskType(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.taskTypeService.deleteTaskType(id, userId);
  }
}
