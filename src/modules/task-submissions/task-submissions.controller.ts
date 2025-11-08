import {
  Controller,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { UpdateTaskSubmissionDto } from './dto/requests/update-task-submission.dto';
import { TaskSubmissionService } from './task-submissions.service';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { FilterTaskSubmissionDto } from './dto/requests/filter-task-submission.dto';

@Controller('/task-submissions')
export class TaskSubmissionController {
  constructor(private readonly taskSubmissionService: TaskSubmissionService) {}

  /**
   * [GET] /classes/:classSlug/tasks/:taskSlug
   * Mendapatkan detail satu task (tanpa pertanyaan)
   */
  @Get('/classes/:classSlug/tasks/:taskSlug')
  async getTaskSubmissionsInClass(
    @Param('classSlug') classSlug: string,
    @Param('taskSlug') taskSlug: string,
    @Query() filterDto: FilterTaskSubmissionDto,
  ) {
    return this.taskSubmissionService.findTaskSubmissionsInClass(
      classSlug,
      taskSlug,
      filterDto,
    );
  }

  /**
   * [GET] /:id
   * Mendapatkan detail submission + detail task + pertanyaan + jawaban
   */
  //   @Get(':id')
  //   async getTaskSubmissionDetail(@Param('id') id: string) {
  //     if (!id) {
  //       throw new BadRequestException('Task submission id is required');
  //     }
  //     return this.taskSubmissionService.findTaskSubmissionById(id);
  //   }

  @Put(':id')
  @UseGuards(OptionalJwtAuthGuard)
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
