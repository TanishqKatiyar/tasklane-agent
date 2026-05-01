import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { CreateProjectDto, ListProjectsDto,UpdateProjectDto } from './dto';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { ProjectsService } from './projects.service';

// ──────────────────────────────────────────────────────────────
// Team-scoped endpoints: /teams/:teamId/projects
// ──────────────────────────────────────────────────────────────

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('teams/:teamId/projects')
export class TeamProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @UseGuards(TeamMembershipGuard)
  @TeamRoles('ADMIN')
  @ApiOperation({ summary: 'Create a project in a team (ADMIN only)' })
  @ApiParam({ name: 'teamId' })
  @ApiResponse({ status: 201, description: 'Project created' })
  @ApiResponse({ status: 409, description: 'Duplicate project key' })
  async create(
    @Param('teamId') teamId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projects.create(teamId, dto, userId);
  }

  @Get()
  @UseGuards(TeamMembershipGuard)
  @ApiOperation({
    summary: 'List projects in a team (paginated, with task counts)',
  })
  @ApiParam({ name: 'teamId' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'ARCHIVED', 'COMPLETED'],
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: 200,
    description: 'Paginated project list with task counts',
    schema: {
      example: {
        data: [
          {
            id: 'clxyz...',
            name: 'Backend API',
            key: 'API',
            status: 'ACTIVE',
            taskCounts: { TODO: 5, IN_PROGRESS: 3, DONE: 12 },
          },
        ],
        meta: { total: 1, page: 1, limit: 20, hasMore: false },
      },
    },
  })
  async list(
    @Param('teamId') teamId: string,
    @Query() query: ListProjectsDto,
  ) {
    return this.projects.list(teamId, query);
  }
}

// ──────────────────────────────────────────────────────────────
// Project-scoped endpoints: /projects/:projectId
// ──────────────────────────────────────────────────────────────

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get(':projectId')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Get project details + members + task summary' })
  @ApiParam({ name: 'projectId' })
  @ApiResponse({ status: 200, description: 'Project details' })
  async getById(@Param('projectId') projectId: string) {
    return this.projects.getById(projectId);
  }

  @Patch(':projectId')
  @UseGuards(ProjectAccessGuard)
  // NOTE: No @TeamRoles('ADMIN') — any team member can update project metadata.
  // Rationale: Projects are collaborative; restricting edits to admins only
  // would create bottlenecks. The ProjectAccessGuard already ensures the
  // user is a team member. For stricter control, uncomment @TeamRoles('ADMIN').
  @ApiOperation({
    summary: 'Update project (any team member)',
    description:
      'Any team member can update project metadata (name, description, color, dates). ' +
      'This is intentional — projects are collaborative and overly strict permissions ' +
      'would impede agility. Access is still scoped to team members only.',
  })
  @ApiParam({ name: 'projectId' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  async update(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(projectId, dto);
  }

  @Delete(':projectId')
  @UseGuards(ProjectAccessGuard)
  @TeamRoles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive project — soft delete (ADMIN only)',
    description: 'Sets project status to ARCHIVED. Use POST /restore to undo.',
  })
  @ApiParam({ name: 'projectId' })
  @ApiResponse({ status: 200, description: 'Project archived' })
  async archive(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projects.archive(projectId, userId);
  }

  @Post(':projectId/restore')
  @UseGuards(ProjectAccessGuard)
  @TeamRoles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived project (ADMIN only)' })
  @ApiParam({ name: 'projectId' })
  @ApiResponse({ status: 200, description: 'Project restored' })
  async restore(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projects.restore(projectId, userId);
  }
}
