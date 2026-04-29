import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() body: { name: string }) {
    console.log('Creating user with name:', body.name); 
    return this.userService.createUser(body.name);
  }

  @Get()
  async listUsers() {
    return this.userService.listAllUsers();
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Post(':id/process-month')
  async processMonth(@Param('id') id: string) {
    return this.userService.processMonth(id);
  }

  @Post(':id/action')
  async applyAction(@Param('id') id: string, @Body() action: any) {
    return this.userService.applyAction(id, action);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}