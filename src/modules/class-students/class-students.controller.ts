import {
  Controller,
  Req,
  UseGuards,
  Post,
  Body,
  Delete,
  Param,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ClassStudentService } from './class-students.service';
import { JoinClassDto } from './dto/requests/join-class-request.dto';

@Controller('class-students')
export class ClassStudentController {
  constructor(private readonly classStudentService: ClassStudentService) {}

  /**
   * [GET] /class-students
   * Join ke dalam kelas yang sudah dipilih
   */
  @Get('/teacher/me/total-students')
  @UseGuards(JwtAuthGuard)
  async getTeacherTotalStudents(@Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.classStudentService.findTeacherTotalStudents(userId);
  }

  /**
   * [POST] /class-students
   * Join ke dalam kelas yang sudah dipilih
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async joinClass(@Body() dto: JoinClassDto, @Req() req: any) {
    const userId = req.user?.id || null;
    return this.classStudentService.joinClass(dto, userId);
  }

  /**
   * [DELETE] /class-students/:id
   * Keluar dari kelas yang dipilih
   */
  @Delete(':classId')
  @UseGuards(JwtAuthGuard)
  async leaveClass(@Param('classId') classId: string, @Req() req: any) {
    const userId = req.user?.id || null;
    return this.classStudentService.leaveClass(classId, userId);
  }
}
