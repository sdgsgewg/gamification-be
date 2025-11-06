import {
  Controller,
  Post,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateTaskSubmissionDto } from './dto/requests/create-task-submission.dto';
import { UpdateTaskSubmissionDto } from './dto/requests/update-task-submission.dto';
import { TaskSubmissionService } from './task-submissions.service';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('/task-submissions')
export class TaskSubmissionController {
  constructor(private readonly taskSubmissionService: TaskSubmissionService) {}

  //   @Get('')
  //   @UseGuards(OptionalJwtAuthGuard)
  //   async getAllTaskAttemptsByUser(
  //     @Query() filterDto: FilterTaskAttemptDto,
  //     @Req() req: any,
  //   ) {
  //     // Ambil userId dari request (kalau user login)
  //     const userId = req.user?.id || null;

  //     return this.taskSubmissionService.findAllTaskAttemptsbyUser(userId, filterDto);
  //   }

  //   @Get(':id')
  //   async getTaskAttemptDetail(@Param('id') id: string) {
  //     if (!id) {
  //       throw new BadRequestException('Task attempt id is required');
  //     }
  //     return this.taskSubmissionService.findTaskAttemptById(id);
  //   }

  @Post()
  async create(@Body() dto: CreateTaskSubmissionDto) {
    return this.taskSubmissionService.createTaskSubmission(dto);
  }

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
