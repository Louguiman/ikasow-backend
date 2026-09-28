import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
// No `.js` extension: this was the only such import in the repo, and jest's resolver
// cannot map it back to index.ts, which made anything importing this gateway untestable.
import { WsJwtGuard } from '../auth/guards';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
@UseGuards(WsJwtGuard)
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Joins the caller to their **own** rooms.
   *
   * This used to join whatever `agencyId` the client sent, so any authenticated
   * socket could subscribe to another tenant's agency room and receive its
   * broadcasts. The agency is now read from the verified token that
   * `WsJwtGuard` put on `client.data.user`, and a platform admin — who has no
   * single agency of their own — may name one.
   *
   * The `user-` room is joined for everybody, because that is the room
   * `sendToUser` targets.
   */
  @SubscribeMessage('join-agency')
  handleJoinAgency(client: Socket, agencyId?: string) {
    const user = client.data?.user;

    if (!user) {
      throw new WsException('Unauthorized');
    }

    client.join(`user-${user.sub}`);

    if (user.role === 'platform-admin') {
      if (!agencyId) {
        throw new WsException('An agencyId is required for a platform admin');
      }
      client.join(`agency-${agencyId}`);
      this.logger.log(
        `Platform admin ${client.id} joined agency room: ${agencyId}`,
      );
      return;
    }

    if (!user.agencyId) {
      throw new WsException('User is not associated with an agency');
    }

    // A non-admin naming a different agency is refused rather than silently
    // corrected, so the client learns its token does not grant that room.
    if (agencyId && agencyId !== user.agencyId) {
      throw new WsException('Forbidden');
    }

    client.join(`agency-${user.agencyId}`);
    this.logger.log(
      `Client ${client.id} joined agency room: ${user.agencyId}`,
    );
  }

  sendToAgency(agencyId: string, event: string, payload: any) {
    this.server.to(`agency-${agencyId}`).emit(event, payload);
  }

  sendToUser(userId: string, event: string, payload: any) {
    this.server.to(`user-${userId}`).emit(event, payload);
  }
}
