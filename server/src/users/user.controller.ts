import { Controller, Get, Post, Patch, Body, Param, Delete, Headers } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() body: { username: string; password: string }) {
    return this.userService.createUser(body.username, body.password);
  }

  @Post('login')
  async loginUser(@Body() body: { username: string; password: string }) {
    return this.userService.loginUser(body.username, body.password);
  }

  @Get()
  async listUsers() {
    return this.userService.listAllUsers();
  }

  @Post('admin/list')
  async listUsersForAdmin(@Headers('authorization') authorization?: string) {
    return this.userService.listUsersForAdmin(authorization);
  }

  @Patch('admin/:targetUserId')
  async adminUpdateUser(
    @Param('targetUserId') targetUserId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: {
      checking?: number;
      savings?: number;
      debt?: number;
      isAdmin?: boolean;
      username?: string;
      password?: string;
      jobTitle?: string;
      economyOverrides?: {
        recessionSeverity?: number;
        inflationPressure?: number;
        jobAvailability?: number;
        marketVolatility?: number;
        nextMonthStockShock?: number;
      };
      economyApplyMonths?: number;
      historicalEconomicEvent?: {
        id?: string;
        title?: string;
        era?: string;
        summary?: string;
        totalMonths?: number;
        monthsRemaining?: number;
        startedMonth?: number;
        startedYear?: number;
        effects?: {
          jobLossChance?: number;
          forcedDowngradeChance?: number;
          payCutPercent?: number;
          monthlyStockShock?: number;
          essentialCostIncreasePercent?: number;
          creditDragPerMonth?: number;
          jobSearchBlocked?: boolean;
        };
      } | null;
      historicalEventResetNextMonth?: boolean;
    },
  ) {
    return this.userService.adminUpdateUser(authorization, targetUserId, {
      checking: body.checking,
      savings: body.savings,
      debt: body.debt,
      isAdmin: body.isAdmin,
      username: body.username,
      password: body.password,
      jobTitle: body.jobTitle,
      economyOverrides: body.economyOverrides,
      economyApplyMonths: body.economyApplyMonths,
      historicalEconomicEvent: body.historicalEconomicEvent,
      historicalEventResetNextMonth: body.historicalEventResetNextMonth,
    });
  }

  @Post('admin/:targetUserId/gift')
  async adminGiftUser(
    @Param('targetUserId') targetUserId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { amount?: number; templateId?: string },
  ) {
    return this.userService.adminGiftUser(authorization, targetUserId, {
      amount: body.amount,
      templateId: body.templateId,
    });
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.userService.updateUser(id, body);
  }

  @Post(':id/process-month')
  async processMonth(@Param('id') id: string) {
    return this.userService.processMonth(id);
  }

  @Post(':id/action')
  async applyAction(@Param('id') id: string, @Body() action: any) {
    return this.userService.applyAction(id, action);
  }

  @Delete('admin/:targetUserId')
  async adminDeleteUser(
    @Param('targetUserId') targetUserId: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.userService.adminDeleteUser(authorization, targetUserId);
  }
}