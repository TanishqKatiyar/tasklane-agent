import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  MessageEvent,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { TeamsService } from '../teams/teams.service';
import { AiService } from './ai.service';
import { AutoPriorityRequestDto, AutoPriorityResponseSchema } from './dto/auto-priority.schema';
import { BreakdownRequestDto, BreakdownResponseSchema } from './dto/breakdown.schema';
import { ChatRequestDto } from './dto/chat.schema';
import { StandupRequestDto, StandupResponseSchema } from './dto/standup.schema';
import {
  SuggestAssigneeRequestDto,
  SuggestAssigneeResponseSchema,
} from './dto/suggest-assignee.schema';
import { AiThrottlerGuard } from './guards/ai-throttler.guard';
import { buildAutoPriorityPrompt } from './prompts/auto-priority.prompt';
import { buildBreakdownPrompt } from './prompts/breakdown.prompt';
import { buildChatSystemPrompt } from './prompts/chat.prompt';
import { buildStandupPrompt } from './prompts/standup.prompt';
import { buildSuggestAssigneePrompt } from './prompts/suggest-assignee.prompt';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly teamsService: TeamsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check if AI features are configured' })
  async healthCheck() {
    const isHealthy = await this.aiService.isHealthy();
    return { status: isHealthy ? 'ok' : 'disabled' };
  }

  @Post('breakdown')
  @UseGuards(JwtAuthGuard, AiThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Breakdown a task into subtasks' })
  async breakdown(@Body() body: BreakdownRequestDto, @Req() req: any) {
    const project = await this.projectsService.getById(body.projectId);
    if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

    const recentTasksData = await this.tasksService.list(body.projectId, { limit: 5 } as any);
    const recentTasks = recentTasksData.data || [];
    const sampleTasks = recentTasks.map((t: any) => ({
      title: t.title,
      description: t.description,
    }));

    const taskTitle = body.taskId
      ? (await this.tasksService.getById(body.taskId))?.title
      : body.taskTitle;

    const systemPrompt = buildBreakdownPrompt(project.name, sampleTasks);
    const userPrompt = `Task to breakdown:\nTitle: ${taskTitle}\nDescription: ${body.taskDescription || 'N/A'}`;

    return this.aiService.complete({
      feature: 'breakdown',
      userId: req.user.id,
      teamId: project.teamId,
      systemPrompt,
      userPrompt,
      schema: BreakdownResponseSchema,
      cacheKey: `breakdown:${body.taskId || body.taskTitle}`,
    });
  }

  @Post('suggest-assignee')
  @UseGuards(JwtAuthGuard, AiThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suggest an assignee for a task' })
  async suggestAssignee(@Body() body: SuggestAssigneeRequestDto, @Req() req: any) {
    const task = await this.tasksService.getById(body.taskId);
    if (!task) throw new HttpException('Task not found', HttpStatus.NOT_FOUND);

    const project = await this.projectsService.getById(task.projectId);
    const teamMemberships = await this.teamsService.listMembers(project.teamId);

    // In a real app we would fetch active task counts per member here.
    const membersData = teamMemberships.map((m: any) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
    }));

    const systemPrompt = buildSuggestAssigneePrompt(
      task.title,
      task.description || '',
      membersData,
    );
    const userPrompt = `Suggest assignees for task: ${task.title}`;

    return this.aiService.complete({
      feature: 'suggest_assignee',
      userId: req.user.id,
      teamId: project.teamId,
      systemPrompt,
      userPrompt,
      schema: SuggestAssigneeResponseSchema,
      cacheKey: `suggest_assignee:${task.id}`,
    });
  }

  @Post('auto-priority')
  @UseGuards(JwtAuthGuard, AiThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Auto-classify priority of a task' })
  async autoPriority(@Body() body: AutoPriorityRequestDto, @Req() req: any) {
    const systemPrompt = buildAutoPriorityPrompt(body.taskTitle, body.taskDescription);
    const userPrompt = `Classify this task: ${body.taskTitle}`;

    return this.aiService.complete({
      feature: 'auto_priority',
      userId: req.user.id,
      systemPrompt,
      userPrompt,
      schema: AutoPriorityResponseSchema,
      cacheKey: `auto_priority:${body.taskTitle}`,
    });
  }

  @Post('standup')
  @UseGuards(JwtAuthGuard, AiThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate an AI standup summary for a team' })
  async standup(@Body() body: StandupRequestDto, @Req() req: any) {
    // We would fetch activity logs for the team here. Mocking for now as requested by the prompt.
    const activityLogs = [
      { user: 'Alice', action: 'completed task', task: 'Setup DB' },
      { user: 'Bob', action: 'created task', task: 'Implement Auth' },
    ];

    const systemPrompt = buildStandupPrompt(activityLogs);
    const userPrompt = `Generate standup for team ${body.teamId}`;

    return this.aiService.complete({
      feature: 'standup',
      userId: req.user.id,
      teamId: body.teamId,
      systemPrompt,
      userPrompt,
      schema: StandupResponseSchema,
      cacheKey: `standup:${body.teamId}:${new Date().toISOString().split('T')[0]}`,
    });
  }

  @Sse('chat')
  @UseGuards(JwtAuthGuard, AiThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stream chat with AI assistant' })
  chat(@Body() body: ChatRequestDto, @Req() req: any): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      // In a real implementation with streaming, we would use Groq's or Gemini's streaming APIs
      // and yield MessageEvent objects `{ data: chunk }`
      this.projectsService.getById(body.projectId).then((project: any) => {
        const systemPrompt = buildChatSystemPrompt(`Project: ${project?.name}`);
        this.aiService
          .complete({
            feature: 'chat',
            userId: req.user.id,
            teamId: project?.teamId,
            systemPrompt,
            userPrompt: body.question,
            // No schema, return raw text for chat
          })
          .then((response) => {
            subscriber.next({ data: JSON.stringify({ content: response }) });
            subscriber.complete();
          })
          .catch((err) => {
            subscriber.error(err);
          });
      });
    });
  }
}
