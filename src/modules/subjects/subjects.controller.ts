import {
  BadRequestException,
  Controller,
  Query,
  Body,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubjectService } from './subjects.service';
import { FilterSubjectDto } from './dto/requests/filter-subject.dto';
import { CreateSubjectDto } from './dto/requests/create-subject.dto';
import { UpdateSubjectDto } from './dto/requests/update-subject.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('/subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get('')
  async getAllSubjects(@Query() filterDto: FilterSubjectDto) {
    return this.subjectService.findAllSubjects(filterDto);
  }

  @Get(':slug')
  async getSubjectDetail(@Param('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Subject slug is required');
    }
    return this.subjectService.findSubjectBySlug(slug);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor('imageFile'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
    @Req() req: any,
  ) {
    const dto: CreateSubjectDto = JSON.parse(rawData);

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.subjectService.createSubject(userId, dto, file);
  }

  @Put(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor('imageFile'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
    @Req() req: any,
  ) {
    const dto: UpdateSubjectDto = JSON.parse(rawData);

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.subjectService.updateSubject(id, userId, dto, file);
  }

  @Delete(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.subjectService.deleteSubject(id, userId);
  }
}
