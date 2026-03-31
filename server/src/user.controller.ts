import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() body: { name: string }) {
    return this.userService.createUser(body.name);
  }

  @Get(':name')
  async getUser(@Param('name') name: string) {
    return this.userService.getUserByName(name);
  }

  @Post(':name/process-month')
  async processMonth(@Param('name') name: string) {
    return this.userService.processMonth(name);
  }

  // Add more endpoints for other actions
}