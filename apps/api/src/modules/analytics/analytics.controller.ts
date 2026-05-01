import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TeamRoles } from '../teams/decorators/team-roles.decorator';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { AnalyticsService } from './analytics.service';

// ──────────────────────────────────────────────────────────────
// Personal Dashboard endpoints: /users/me/*
// ──────────────────────────────────────────────────────────────

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('users/me')
export class DashboardController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Aggregated personal dashboard (single request)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard data with stats, trends, tasks' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.analytics.getPersonalDashboard(userId);
  }

  @Get('inbox-quick-create')
  @ApiOperation({
    summary: 'Returns userId + default project for quick task creation',
  })
  async getInboxQuickCreate(@CurrentUser('id') userId: string) {
    return this.analytics.getInboxQuickCreate(userId);
  }

  @Post('quick-task')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a task in the default project backlog',
    description: 'Returns 422 if user has no projects.',
  })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 422, description: 'No projects found' })
  async createQuickTask(@CurrentUser('id') userId: string, @Body() body: { title: string }) {
    return this.analytics.createQuickTask(userId, body.title);
  }
}

// ──────────────────────────────────────────────────────────────
// Team Analytics endpoint: /teams/:teamId/analytics
// ──────────────────────────────────────────────────────────────

@ApiTags('Team Analytics')
@ApiBearerAuth()
@Controller('teams/:teamId/analytics')
export class TeamAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @UseGuards(TeamMembershipGuard)
  @TeamRoles('ADMIN')
  @ApiOperation({
    summary: 'Team analytics overview (ADMIN only)',
    description:
      'KPIs, burndown, throughput, workload heatmap, cycle time, priority/status breakdowns.',
  })
  @ApiParam({ name: 'teamId' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['7d', '30d', '90d'],
    description: 'Analysis period. Defaults to 30d.',
  })
  @ApiResponse({ status: 200, description: 'Full analytics payload' })
  @ApiResponse({ status: 403, description: 'Not a team admin' })
  async getOverview(@Param('teamId') teamId: string, @Query('period') period?: string) {
    const periodDays = period === '90d' ? 90 : period === '7d' ? 7 : 30;
    return this.analytics.getTeamAnalytics(teamId, periodDays);
  }
}
