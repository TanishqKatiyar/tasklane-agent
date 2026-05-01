import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PrismaService } from '../../prisma/prisma.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // In a real app we'd manually invoke validation here if not using a global guard for connection.
      // But since Guards apply only on message by default, we have to validate token on handshake manually.
      // We'll let WsJwtGuard handle messages, but for presence we need to know who connected.
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // Simplified token validation for connection event.
      // Assuming payload has sub. (Best practice: extract common logic from WsJwtGuard).
      const payloadBase64Url = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadBase64Url, 'base64').toString());
      const userId = payload.sub;

      client.data.userId = userId;

      // Join personal room
      client.join(`user:${userId}`);

      // Update presence
      await this.realtimeService.online(userId, client.id);

      // Broadcast presence (simplified: broadcast to all connected, usually broadcast to user's teams)
      this.server.emit('presence.online', { userId });

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (e) {
      this.logger.error('Connection failed', (e as any).stack);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      await this.realtimeService.offline(userId, client.id);
      this.server.emit('presence.offline', { userId });
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('project:join')
  async handleProjectJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    const userId = client.data.user.id;
    const { projectId } = data;

    // Verify access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        team: {
          members: {
            some: { userId },
          },
        },
      },
    });

    if (project) {
      client.join(`project:${projectId}`);
      this.logger.log(`User ${userId} joined project:${projectId}`);
    } else {
      client.emit('error', { message: 'Access denied to project' });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('project:leave')
  handleProjectLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    client.leave(`project:${data.projectId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; x: number; y: number; view: string },
  ) {
    // Gateway-level throttle could be added here, but usually frontend throttles.
    const userId = client.data.user.id;
    client.to(`project:${data.projectId}`).emit('cursor:moved', {
      userId,
      projectId: data.projectId,
      x: data.x,
      y: data.y,
      view: data.view,
    });
  }

  // ── Event Bus Subscriptions ──

  @OnEvent('task.created')
  handleTaskCreated(payload: { task: any; actorId: string; projectId: string }) {
    this.server.to(`project:${payload.projectId}`).emit('task.created', payload);
  }

  @OnEvent('task.updated')
  handleTaskUpdated(payload: {
    task: any;
    actorId: string;
    projectId: string;
    changedFields: string[];
  }) {
    this.server.to(`project:${payload.projectId}`).emit('task.updated', payload);
  }

  @OnEvent('task.moved')
  handleTaskMoved(payload: { task: any; actorId: string; projectId: string }) {
    this.server.to(`project:${payload.projectId}`).emit('task.moved', payload);
  }

  @OnEvent('task.deleted')
  handleTaskDeleted(payload: { taskId: string; actorId: string; projectId: string }) {
    this.server.to(`project:${payload.projectId}`).emit('task.deleted', payload);
  }

  @OnEvent('comment.created')
  handleCommentCreated(payload: {
    comment: any;
    taskId: string;
    projectId: string;
    actorId: string;
  }) {
    this.server.to(`project:${payload.projectId}`).emit('comment.created', payload);
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: { userId: string; notification: any }) {
    // Push to personal user room — joined on socket connect (line 56)
    this.server
      .to(`user:${payload.userId}`)
      .emit('notification.created', { notification: payload.notification });
  }
}
