import { Injectable } from '@nestjs/common';

/**
 * Computes task cycle time using the formula:
 *   cycleTime = completedAt - (startedAt ?? createdAt)
 *
 * If startedAt is null we fall back to createdAt, which means the
 * "cycle" starts the moment the task was created rather than when
 * someone explicitly moved it to IN_PROGRESS.
 */
@Injectable()
export class CycleTimeService {
  calculateHours(task: {
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }): number | null {
    if (!task.completedAt) return null;

    const start = (task.startedAt ?? task.createdAt).getTime();
    const end = task.completedAt.getTime();

    return Math.max(0, (end - start) / (1000 * 60 * 60));
  }
}
