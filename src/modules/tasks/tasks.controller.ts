import {
  Controller,
  Query,
  Get,
  Post,
  Put,
  Delete,
  Param,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TaskService } from './tasks.service';
import { FilterTaskDto } from './dto/requests/filter-task.dto';
import { CreateTaskDto } from './dto/requests/create-task.dto';
import { UpdateTaskDto } from './dto/requests/update-task.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('')
  async getAllTasks(@Query() filterDto: FilterTaskDto) {
    return this.taskService.findAllTasks(filterDto);
  }

  @Get(':slug')
  async getTaskDetail(@Param('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Task slug is required');
    }
    return this.taskService.findTaskBySlug(slug);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('data') rawData: string,
    @Req() req: any,
  ) {
    try {
      const dto: CreateTaskDto = JSON.parse(rawData);

      let cover: Express.Multer.File | undefined;
      files.forEach((file) => {
        if (file.fieldname === 'imageFile') {
          cover = file;
        }
        if (file.fieldname.startsWith('questionImage_')) {
          const index = parseInt(
            file.fieldname.replace('questionImage_', ''),
            10,
          );
          if (!isNaN(index) && dto.questions[index]) {
            dto.questions[index].imageFile = file;
          }
        }
      });

      // Ambil userId dari request (kalau user login)
      const userId = req.user?.id || null;

      return this.taskService.createTask(userId, dto, cover);
    } catch (e) {
      console.error('Error create task:', e);
      throw e;
    }
  }

  @Put(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('data') rawData: string,
    @Req() req: any,
  ) {
    try {
      const dto: UpdateTaskDto = JSON.parse(rawData);

      let cover: Express.Multer.File | undefined;
      if (files) {
        files.forEach((file) => {
          if (file.fieldname === 'imageFile') {
            cover = file;
          }
          if (file.fieldname.startsWith('questionImage_')) {
            const index = parseInt(
              file.fieldname.replace('questionImage_', ''),
              10,
            );
            if (!isNaN(index) && dto.questions[index]) {
              dto.questions[index].imageFile = file;
            }
          }
        });
      }

      // Ambil userId dari request (kalau user login)
      const userId = req.user?.id || null;

      return this.taskService.updateTask(id, userId, dto, cover);
    } catch (e) {
      console.error('Error update task:', e);
      throw e;
    }
  }

  @Delete(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.taskService.deleteTask(id, userId);
  }
}
