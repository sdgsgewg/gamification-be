import { Controller, Get } from '@nestjs/common';
import { GradeService } from './grades.service';

@Controller('/grades')
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @Get('/get-all-grades')
  async getAllGrades() {
    return this.gradeService.findAllGrades();
  }
}
