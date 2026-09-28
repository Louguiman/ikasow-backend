import { NotificationsGateway } from './notifications.gateway';
import { WsException } from '@nestjs/websockets';
import { UserRole } from '../users/entities/user.entity';

/**
 * The regression these tests exist for: `join-agency` used to join whatever
 * `agencyId` the client sent, so any authenticated socket could subscribe to
 * another tenant's room and receive its broadcasts. The agency now comes from
 * the token that `WsJwtGuard` verified.
 */
describe('NotificationsGateway.handleJoinAgency', () => {
  let gateway: NotificationsGateway;
  let client: {
    id: string;
    data: Record<string, unknown>;
    join: jest.Mock;
  };

  const socketFor = (user: Record<string, unknown> | undefined) => {
    client = {
      id: 'socket-1',
      data: user ? { user } : {},
      join: jest.fn().mockResolvedValue(undefined),
    };
    return client as never;
  };

  beforeEach(() => {
    gateway = new NotificationsGateway();
    // The gateway decorator injects `server`; nothing here emits.
    (gateway as unknown as { server: unknown }).server = { to: jest.fn() };
  });

  it('joins the caller to their own agency room', () => {
    const socket = socketFor({
      sub: 'user-1',
      role: UserRole.ADMIN,
      agencyId: 'agency-1',
    });

    gateway.handleJoinAgency(socket);

    expect(socket.join).toHaveBeenCalledWith('agency-agency-1');
  });

  it('joins the user room for everybody', () => {
    const socket = socketFor({
      sub: 'user-1',
      role: UserRole.AGENT,
      agencyId: 'agency-1',
    });

    gateway.handleJoinAgency(socket);

    // `sendToUser` targets `user-<id>`, so this room is how a user gets
    // notifications that are addressed to them rather than their agency.
    expect(socket.join).toHaveBeenCalledWith('user-user-1');
  });

  it('refuses to join an agency the token does not grant', () => {
    const socket = socketFor({
      sub: 'user-1',
      role: UserRole.ADMIN,
      agencyId: 'agency-1',
    });

    expect(() => gateway.handleJoinAgency(socket, 'agency-2')).toThrow(
      WsException,
    );
    expect(socket.join).not.toHaveBeenCalledWith('agency-agency-2');
  });

  it('does not join anything when the guard left no user on the socket', () => {
    const socket = socketFor(undefined);

    expect(() => gateway.handleJoinAgency(socket)).toThrow(WsException);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('refuses a user with no agency', () => {
    const socket = socketFor({ sub: 'user-1', role: UserRole.AGENT });

    expect(() => gateway.handleJoinAgency(socket)).toThrow(WsException);
  });

  it('lets a platform admin name the agency, since it has none of its own', () => {
    const socket = socketFor({
      sub: 'root',
      role: UserRole.PLATFORM_ADMIN,
      agencyId: null,
    });

    gateway.handleJoinAgency(socket, 'agency-9');

    expect(socket.join).toHaveBeenCalledWith('agency-agency-9');
    expect(socket.join).toHaveBeenCalledWith('user-root');
  });

  it('still requires a platform admin to name one', () => {
    const socket = socketFor({
      sub: 'root',
      role: UserRole.PLATFORM_ADMIN,
      agencyId: null,
    });

    expect(() => gateway.handleJoinAgency(socket)).toThrow(WsException);
  });
});
