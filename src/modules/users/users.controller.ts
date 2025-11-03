import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FilterUserDto } from './dto/requests/filter-user.dto';

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
}
