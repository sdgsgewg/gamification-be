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
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('/classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get('')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserClasses(@Query() filterDto: FilterClassDto, @Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.classService.findUserClasses(userId, filterDto);
  }

  @Get('not-joined')
  @UseGuards(OptionalJwtAuthGuard)
  async getNotJoinedClasses(@Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.classService.findNotJoinedClasses(userId);
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
  @UseInterceptors(FileInterceptor('imageFile'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
  ) {
    const dto: CreateClassDto = JSON.parse(rawData);
    return this.classService.createClass(dto, file);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('imageFile'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
  ) {
    const dto: UpdateClassDto = JSON.parse(rawData);
    return this.classService.updateClass(id, dto, file);
  }
}
