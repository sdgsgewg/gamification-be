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
} from '@nestjs/common';
import { SubjectService } from './subjects.service';
import { FilterSubjectDto } from './dto/requests/filter-subject.dto';
import { CreateSubjectDto } from './dto/requests/create-subject.dto';
import { UpdateSubjectDto } from './dto/requests/update-subject.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @UseInterceptors(FileInterceptor('imageFile'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
  ) {
    const dto: CreateSubjectDto = JSON.parse(rawData);
    return this.subjectService.createSubject(dto, file);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('imageFile'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
  ) {
    const dto: UpdateSubjectDto = JSON.parse(rawData);
    return this.subjectService.updateSubject(id, dto, file);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.subjectService.deleteSubject(id);
  }
}
