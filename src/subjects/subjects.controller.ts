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
} from '@nestjs/common';
import { SubjectService } from './subjects.service';
import { FilterSubjectDto } from './dto/filter-subject.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

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
  async create(@Body() dto: CreateSubjectDto) {
    return this.subjectService.createSubject(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.updateSubject(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.subjectService.deleteSubject(id);
  }
}
