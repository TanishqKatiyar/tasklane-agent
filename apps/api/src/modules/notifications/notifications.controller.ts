import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Req,
  Res,
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
import { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMembershipGuard } from '../teams/guards/team-membership.guard';
import { DigestService } from './digest.service';
import { ListNotificationsDto, UpdatePreferencesDto } from './dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly digest: DigestService,
  ) {}

  // ── List (cursor pagination) ──────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List notifications with cursor pagination' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'filter', required: false, enum: ['all', 'unread'] })
  @ApiResponse({ status: 200 })
  async list(
    @CurrentUser('id') userId: string,
    @Query() query: ListNotificationsDto,
  ) {
    return this.notifications.list(userId, query);
  }

  // ── Mark single read ─────────────────────────────────────────────────

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  async markRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notifications.markRead(id, userId);
  }

  // ── Mark all read ────────────────────────────────────────────────────

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200 })
  async markAllRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  // ── Delete single ────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200 })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notifications.delete(id, userId);
  }

  // ── Preferences ──────────────────────────────────────────────────────

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200 })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notifications.getOrCreatePreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200 })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notifications.updatePreferences(userId, dto);
  }

  // ── Unsubscribe (no auth — from email link) ─────────────────────────

  @Get('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unsubscribe via HMAC token from email link (no auth required)',
  })
  @ApiQuery({ name: 'token' })
  @ApiQuery({ name: 'userId' })
  @ApiQuery({ name: 'type' })
  async unsubscribe(
    @Query('token') token: string,
    @Query('userId') userId: string,
    @Query('type') type: string,
    @Res() res: Response,
  ) {
    try {
      await this.notifications.unsubscribe(token, userId, type);
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>Unsubscribed — Tasklane</title></head>
          <body style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1a1a2e;">
            <h1 style="color:#6366f1;margin-bottom:8px;">Tasklane</h1>
            <h2>You're unsubscribed</h2>
            <p style="color:#64748b">You'll no longer receive <strong>${type.replace(/_/g, ' ').toLowerCase()}</strong> emails.</p>
            <p style="margin-top:32px"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/notifications" style="color:#6366f1">Manage all preferences</a></p>
          </body>
        </html>
      `);
    } catch {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>Invalid link — Tasklane</title></head>
          <body style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1a1a2e;">
            <h1 style="color:#6366f1">Tasklane</h1>
            <h2>Invalid or expired link</h2>
            <p style="color:#64748b">This unsubscribe link is not valid.</p>
          </body>
        </html>
      `);
    }
  }
}

// ── Team Activity Feed ────────────────────────────────────────────────────────

@ApiTags('Team Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
@Controller('teams/:teamId/activity')
export class TeamActivityController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Team activity feed (cursor paginated)' })
  @ApiParam({ name: 'teamId' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiResponse({ status: 200 })
  async getActivity(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.notifications.getTeamActivity(teamId, userId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      entityType,
      actorId,
    });
  }
}

// ── Global Activity Feed (My Activity) ────────────────────────────────────────

@ApiTags('My Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/activity')
export class MyActivityController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Global activity feed across all user teams' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiResponse({ status: 200 })
  async getGlobalActivity(
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.notifications.getGlobalActivity(userId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      entityType,
    });
  }
}

// ── Dev Digest Trigger ────────────────────────────────────────────────────────

@ApiTags('Dev')
@Controller('dev')
export class DevController {
  constructor(private readonly digest: DigestService) {}

  @Patch('run-digest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger digest cron (dev/staging only)',
  })
  async runDigest() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Not available in production' };
    }
    await this.digest.runForAllUsers();
    return { message: 'Digest run complete' };
  }
}
