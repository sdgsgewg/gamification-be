import { BadRequestException, Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { UserService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/get-all-users')
  async getAllUsers() {
    return this.userService.findAllUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-logged-in-user')
  async getLoggedInUser(@Req() req) {
    const userId = req.user?.uid; // asumsi payload token punya uid
    return this.userService.getUserById(userId);
  }

  @Get('/get-user-detail/:uid')
  async getUserDetail(@Param('uid') uid: string) {
    if (!uid) {
      throw new BadRequestException('User ID is required');
    }
    return this.userService.getUserById(uid);
  }
}
