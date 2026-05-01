import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    
    // Allow tokens attached to auth payload or fallback to cookies (if parsed)
    const token = client.handshake.auth?.token || this.extractTokenFromCookies(client);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Optionally verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach user to socket data for easy access
      client.data.user = user;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromCookies(_client: Socket): string | undefined {
    // Cookie-based WS auth is intentionally not implemented. Tokens are
    // expected on `handshake.auth.token` (or the Authorization header).
    return undefined;
  }
}
