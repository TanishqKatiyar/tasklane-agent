import { forwardRef, Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TeamMembershipGuard } from './guards/team-membership.guard';
import { InvitationsController, TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [TeamsController, InvitationsController],
  providers: [TeamsService, TeamMembershipGuard],
  exports: [TeamsService, TeamMembershipGuard],
})
export class TeamsModule {}
