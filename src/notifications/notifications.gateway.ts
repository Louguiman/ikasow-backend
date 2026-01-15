import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/index.js';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'notifications',
})
@UseGuards(WsJwtGuard)
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('NotificationsGateway');

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join-agency')
    handleJoinAgency(client: Socket, agencyId: string) {
        client.join(`agency-${agencyId}`);
        this.logger.log(`Client ${client.id} joined agency room: agency-${agencyId}`);
    }

    sendToAgency(agencyId: string, event: string, payload: any) {
        this.server.to(`agency-${agencyId}`).emit(event, payload);
    }

    sendToUser(userId: string, event: string, payload: any) {
        this.server.to(`user-${userId}`).emit(event, payload);
    }
}
