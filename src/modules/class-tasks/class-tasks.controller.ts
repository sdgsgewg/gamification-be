import {
  BadRequestException,
  Controller,
  Query,
  Param,
  Req,
  Get,
  UseGuards,
} from '@nestjs/common';
import { FilterClassTaskDto } from './dto/requests/filter-class-task.dto';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { ClassTaskService } from './class-tasks.service';

@Controller('classes/:classSlug/tasks')
export class ClassTaskController {
  constructor(private readonly classTaskService: ClassTaskService) {}

  /**
   * [GET] /classes/:classSlug/tasks
   * Mendapatkan daftar tugas (task) dalam satu kelas
   */
  @Get()
  async getClassTasks(
    @Param('classSlug') classSlug: string,
    @Query() filterDto: FilterClassTaskDto,
  ) {
    if (!classSlug) {
      throw new BadRequestException('Class slug is required');
    }

    return this.classTaskService.findClassTasks(classSlug, filterDto);
  }

  /**
   * [GET] /classes/:classSlug/tasks/:taskSlug
   * Mendapatkan detail satu task (tanpa pertanyaan)
   */
  @Get(':taskSlug')
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
  @Get(':taskSlug/attempt')
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
  @Get(':taskSlug/summary')
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
}
