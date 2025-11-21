import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FilterUserDto } from './dto/requests/filter-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from './dto/requests/update-user.dto';

@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  async getAllUsers(@Query() filterDto: FilterUserDto) {
    return this.userService.findAllUsers(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getLoggedInUser(@Req() req) {
    const userId = req.user?.id || null;
    return this.userService.findUserBy('id', userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getUserStats(@Req() req) {
    const userId = req.user?.id || null;
    return this.userService.findUserStats(userId);
  }

  @Get('recent-activities')
  @UseGuards(JwtAuthGuard)
  async getUserRecentActivities(@Req() req: any) {
    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;
    return this.userService.findUserRecentActivities(userId);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('User ID is required');
    }
    return this.userService.findUserBy('id', id);
  }

  @Get('username/:username')
  async getUserByUsername(@Param('username') username: string) {
    if (!username) {
      throw new BadRequestException('Username is required');
    }
    return this.userService.findUserBy('username', username);
  }

  @Put('')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('imageFile'))
  async update(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
    @Req() req: any,
  ) {
    const dto: UpdateUserDto = JSON.parse(rawData);

    // Ambil userId dari request (kalau user login)
    const userId = req.user?.id || null;

    return this.userService.updateProfile(userId, dto, file);
  }
}
