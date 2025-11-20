import {
  BadRequestException,
  Controller,
  Query,
  Body,
  Get,
  Post,
  Put,
  Param,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FilterClassDto } from './dto/requests/filter-class.dto';
import { ClassService } from './classes.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateClassDto } from './dto/requests/create-class.dto';
import { UpdateClassDto } from './dto/requests/update-class.dto';
import { FilterClassMemberDto } from './dto/requests/filter-class-member.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('/classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get('')
  async getAllClasses() {
    return this.classService.findAllClasses();
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserClasses(@Query() filterDto: FilterClassDto, @Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.classService.findUserClasses(userId, filterDto);
  }

  @Get('not-joined')
  @UseGuards(JwtAuthGuard)
  async getNotJoinedClasses(
    @Query() filterDto: FilterClassDto,
    @Req() req: any,
  ) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.classService.findNotJoinedClasses(userId, filterDto);
  }

  @Get(':slug')
  async getClassDetail(@Param('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Class slug is required');
    }
    return this.classService.findClassBySlug(slug);
  }

  @Get(':slug/members')
  async getClassMembers(
    @Param('slug') slug: string,
    @Query() filterDto: FilterClassMemberDto,
  ) {
    if (!slug) {
      throw new BadRequestException('Class slug is required');
    }
    return this.classService.findClassMember(slug, filterDto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('imageFile'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
    @Req() req: any,
  ) {
    const dto: CreateClassDto = JSON.parse(rawData);
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.classService.createClass(userId, dto, file);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('imageFile'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
    @Req() req: any,
  ) {
    const dto: UpdateClassDto = JSON.parse(rawData);
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.classService.updateClass(id, userId, dto, file);
  }
}
