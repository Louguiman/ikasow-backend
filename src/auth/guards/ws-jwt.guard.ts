import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
    private logger: Logger = new Logger('WsJwtGuard');

    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient<Socket>();
            const authToken = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

            if (!authToken) {
                throw new WsException('Unauthorized');
            }

            const payload = await this.jwtService.verifyAsync(authToken);
            // Attach user to context for further use
            client.data.user = payload;

            return true;
        } catch (err: any) {
            this.logger.error(`WS Authorization failed: ${err.message || 'Unknown error'}`);
            throw new WsException('Unauthorized');
        }
    }
}
