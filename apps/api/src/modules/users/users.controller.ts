import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto';
import { UsersService } from './users.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ────────────── Profile ──────────────

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile with team memberships' })
  @ApiResponse({ status: 200, description: 'User profile with memberships' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.users.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (name, avatarUrl)' })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  // ────────────── Avatar Upload ──────────────

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Invalid file type "${file.mimetype}". Allowed: ${ALLOWED_MIMES.join(', ')}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
      required: ['avatar'],
    },
  })
  @ApiOperation({ summary: 'Upload avatar image (max 2 MB, png/jpeg/webp)' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  async uploadAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Build public URL (local dev — swap for S3/Supabase in Phase 9)
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const updated = await this.users.setAvatarUrl(userId, avatarUrl);

    return {
      avatarUrl: updated.avatarUrl,
      filename: file.filename,
      size: file.size,
    };
  }

  // ────────────── Search ──────────────

  @Get('search')
  @ApiOperation({
    summary: 'Search users by name/email within a team (max 10 results)',
  })
  @ApiQuery({ name: 'q', description: 'Search query (name or email)' })
  @ApiQuery({ name: 'teamId', description: 'Team ID to scope the search' })
  @ApiResponse({ status: 200, description: 'Matching team members' })
  async search(@Query('q') q: string, @Query('teamId') teamId: string) {
    if (!q || !teamId) {
      throw new BadRequestException('Both "q" and "teamId" query params are required');
    }
    return this.users.search(q, teamId);
  }
}
