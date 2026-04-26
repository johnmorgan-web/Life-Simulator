import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() body: { name: string }) {
    return this.userService.createUser(body.name);
  }

  @Get()
  async listUsers() {
    return this.userService.listAllUsers();
  }

  @Get(':name')
  async getUser(@Param('name') name: string) {
    return this.userService.getUserByName(name);
  }

  @Post(':name/process-month')
  async processMonth(@Param('name') name: string) {
    return this.userService.processMonth(name);
  }

  @Post(':name/action')
  async applyAction(@Param('name') name: string, @Body() action: any) {
    return this.userService.applyAction(name, action);
  }

  @Delete(':name')
  async deleteUser(@Param('name') name: string) {
    return this.userService.deleteUser(name);
  }
}