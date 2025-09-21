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
import { AnyFilesInterceptor } from '@nestjs/platform-express';

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
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
  ) {
    try {
      const dto: CreateSubjectDto = JSON.parse(rawData);

      let cover: Express.Multer.File | undefined;
      if (file.fieldname === 'imageFile') {
        cover = file;
      }

      return this.subjectService.createSubject(dto, cover);
    } catch (e) {
      console.error('Error create subject:', e);
      throw e;
    }
  }

  @Put(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() rawData: string,
  ) {
    try {
      const dto: UpdateSubjectDto = JSON.parse(rawData);

      let cover: Express.Multer.File | undefined;
      if (file.fieldname === 'imageFile') {
        cover = file;
      }

      return this.subjectService.updateSubject(id, dto, cover);
    } catch (e) {
      console.error('Error update subject:', e);
      throw e;
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.subjectService.deleteSubject(id);
  }
}
