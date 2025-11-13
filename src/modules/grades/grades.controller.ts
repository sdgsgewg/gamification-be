import { Controller, Get, Query } from '@nestjs/common';
import { GradeService } from './grades.service';
import { FilterGradeDto } from './dto/requests/filter-grade.dto';

@Controller('/grades')
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @Get('')
  async getAllGrades(@Query() filterDto: FilterGradeDto) {
    return this.gradeService.findAllGrades(filterDto);
  }
}
