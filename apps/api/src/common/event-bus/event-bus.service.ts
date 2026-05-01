import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventBusService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitTaskEvent(
    type: 'task.created' | 'task.updated' | 'task.moved' | 'task.deleted',
    task: any, // Using any for now to avoid Prisma client dependency issues
    actorId: string,
    projectId: string,
    changedFields?: string[]
  ) {
    this.eventEmitter.emit(type, { task, actorId, projectId, changedFields });
  }

  emitCommentEvent(
    type: 'comment.created',
    comment: any,
    taskId: string,
    projectId: string,
    actorId: string
  ) {
    this.eventEmitter.emit(type, { comment, taskId, projectId, actorId });
  }

  emitNotificationEvent(userId: string, notification: any) {
    this.eventEmitter.emit('notification.created', { userId, notification });
  }
}
