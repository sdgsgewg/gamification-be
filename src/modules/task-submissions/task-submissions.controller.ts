import {
  Controller,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  Get,
  // Query,
  BadRequestException,
} from '@nestjs/common';
import { UpdateTaskSubmissionDto } from './dto/requests/update-task-submission.dto';
import { TaskSubmissionService } from './task-submissions.service';
// import { FilterTaskSubmissionDto } from './dto/requests/filter-task-submission.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('/task-submissions')
export class TaskSubmissionController {
  constructor(private readonly taskSubmissionService: TaskSubmissionService) {}

  /**
   * [GET]
   * Mendapatkan daftar pengumpulan tugas dari seluruh kelas milik guru
   */
  @Get('')
  @UseGuards(JwtAuthGuard)
  async getAllTaskSubmissions(
    @Req() req: any,
    // @Query() filterDto: FilterTaskSubmissionDto,
  ) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    // return this.taskSubmissionService.findAllTaskSubmissions(userId, filterDto);
    return this.taskSubmissionService.findAllTaskSubmissions(userId);
  }

  /**
   * [GET] /classes/:classSlug/tasks/:taskSlug
   * Mendapatkan detail satu task (tanpa pertanyaan)
   */
  @Get('/classes/:classSlug/tasks/:taskSlug')
  async getTaskSubmissionsInClass(
    @Param('classSlug') classSlug: string,
    @Param('taskSlug') taskSlug: string,
    // @Query() filterDto: FilterTaskSubmissionDto,
  ) {
    return this.taskSubmissionService.findTaskSubmissionsInClass(
      classSlug,
      taskSlug,
      // filterDto,
    );
  }

  /**
   * [GET] /:id
   * Mendapatkan detail submission + detail task + pertanyaan + jawaban
   */
  @Get(':id')
  async getTaskSubmissionDetail(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Task submission id is required');
    }
    return this.taskSubmissionService.findTaskSubmissionById(id);
  }

  /**
   * [GET] /review/:id
   * Mendapatkan detail submission + pertanyaan + jawaban
   */
  @Get('review/:id')
  async getTaskSubmissionWithAnswers(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Task submission id is required');
    }
    return this.taskSubmissionService.findTaskSubmissionWithAnswers(id);
  }

  /**
   * [PUT] /:id
   * Melakukan update pada task submission
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateTaskSubmissionDto,
  ) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.taskSubmissionService.updateTaskSubmission(id, userId, dto);
  }
}
