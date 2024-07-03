import { WebSocketGateway, SubscribeMessage, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, WsException, MessageBody, WsResponse, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { Observable, firstValueFrom, from, map } from 'rxjs';
import { AuthenticatedSocket } from '@app/common/interfaces';
import { GatewaySessionManager, IGatewaySessionManager } from './chat.session';
import { Inject, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CachingService } from '@core/modules/caching';
import { OnEvent } from '@nestjs/event-emitter';
import { AppService } from './app.service';
import { MSResponse } from '@core/common/interfaces';
import { ClientProxy } from '@nestjs/microservices';
import { APP_CONFIG } from './app.constants';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly sessions: GatewaySessionManager,
    private cache: CachingService,
    @Inject(APP_CONFIG.USER_SERVICE) private readonly userClient: ClientProxy,
    // private usersAuthService: UsersAuthService,
    private chatService: AppService,
  ) { }

  afterInit(server: any) {
    console.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {

    const { authorization: authToken } = client.handshake.headers;

    if (!authToken) {
      throw new UnauthorizedException('You are not authorized! Please Sign in.');
    }

    try {
      const response: MSResponse = await firstValueFrom(
        this.userClient.send({ cmd: 'USER_AUTH' }, { token: authToken }),
      );

      if (!response.status) {
        throw new UnauthorizedException(response.error);
      }

      client.user = response.data!;

      this.sessions.setUserSocket(client.user.userId, client);

      client.emit('connected', 'Connection Successful.');

    } catch (error) {
      client.emit('connection_error', error.message);
      client.disconnect();
      // console.log(error)
      return new InternalServerErrorException(error.message);
    }

  }

  // @WSProtected()
  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected`);
    // const user = client['user'];

    // delete this.connectedClients[user.userId];
  }

  // @ProtectWebSocket()
  @SubscribeMessage('events')
  findAll(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: any): Observable<WsResponse<number>> {
    // const user = client['user'];

    console.log(data);
    const socket = this.sessions.getUserSocket(client.user?.userId!);


    return from([1, 2, 3]).pipe(map(item => ({ event: 'events', data: item })));
  }

  @SubscribeMessage('onChatJoin')
  async onChatJoin(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {

    console.log('onChatJoin');

    const rooms = client.rooms;

    if (rooms.has(`chat-${data.chatId}`)) return

    console.log(
      `${client.user?.userId} joined a Chat of ID: ${data.chatId}`,
    );

    await this.chatService.readAllMessages(data.chatId, client.user?.userId!);

    const chat = await this.chatService.getMyChat(
      data.chatId,
      client.user?.userId!,
      [{ path: 'messages', match: { blockedByRecipient: false }, options: { limit: 50 } }]
    );

    client.join(`chat-${chat.chatId}`);

    client.to(`chat-${chat.chatId}`).emit('userJoin', `${client.user?.firstName.capitalize()} joined the chat`);
  }

  @SubscribeMessage('onChatLeave')
  onChatLeave(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    console.log('onChatLeave');

    const rooms = client.rooms;

    if (!rooms.has(`chat-${data.chatId}`)) return

    client.leave(`chat-${data.chatId}`);

    client.to(`chat-${data.chatId}`).emit('userLeave', `${client.user?.firstName.capitalize()} left the chat`);
  }

  @SubscribeMessage('onTypingStart')
  onTypingStart(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    console.log('onTypingStart');
    console.log(data.chatId);
    console.log(client.rooms);
    client.to(`chat-${data.chatId}`).emit('onTypingStart');
  }

  @SubscribeMessage('onTypingStop')
  onTypingStop(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    console.log('onTypingStop');
    console.log(data.chatId);
    console.log(client.rooms);
    client.to(`chat-${data.chatId}`).emit('onTypingStop');
  }

  // EVENTS
  @OnEvent('message.create')
  handleMessageCreateEvent(payload: { userId: string, text: string, chat: { chatId: string, creatorUserId: string, influencerUserId: string } }) {
    console.log('Inside message.create', payload);
    const {
      userId,
      chat: { creatorUserId, influencerUserId, chatId },
    } = payload;

    const authorSocket = this.sessions.getUserSocket(userId);
    const recipientSocket =
      userId === creatorUserId
        ? this.sessions.getUserSocket(influencerUserId)
        : this.sessions.getUserSocket(creatorUserId);

    if (authorSocket) authorSocket.to(`chat-${chatId}`).emit('onMessage', payload.text);
    // if (recipientSocket) recipientSocket.emit('onMessage', payload.text);
  }

  @OnEvent('message.delete')
  async handleMessageDelete(payload: { userId: string, chatId: string }) {
    console.log('Inside message.delete');
    console.log(payload);
    const chat = await this.chatService.getOne(
      payload.chatId,
    );
    if (!chat) return;
    const { creatorUserId, influencerUserId } = chat;
    const recipientSocket =
      creatorUserId === payload.userId
        ? this.sessions.getUserSocket(influencerUserId)
        : this.sessions.getUserSocket(creatorUserId);
    if (recipientSocket) recipientSocket.emit('onMessageDelete', payload);
  }
}
