import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { LogService, Logger } from '@core/logger';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { APP_CONFIG } from '@app/app.constants';
import { MSResponse } from '@core/common/interfaces';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
// import { CachingService } from '@libs/modules/caching';

@Injectable()
export class ClientMService {
  @Logger(ClientMService.name)private logger = new LogService();

  constructor(
    
    @Inject(APP_CONFIG.USER_SERVICE) private readonly userClient: ClientProxy,
    
    @Inject(APP_CONFIG.INFLUENCER_SERVICE) private readonly influencerClient: ClientProxy,
    
    @Inject(APP_CONFIG.CREATOR_SERVICE) private readonly creatorClient: ClientProxy,
  ) {}

  async authorizedUser(client: Socket) {

    let token = client.handshake.headers.authorization;

    const response: MSResponse = await firstValueFrom(
      this.userClient.send({ cmd: 'USER_AUTH' }, { token }),
    );

    if (!response.status) {
      throw new WsException(response.error);
    }

    return response.data;
  }
  
  async isSuspendedInfluencer(influencerId: string) {

    const response: MSResponse = await firstValueFrom(
      this.influencerClient.send({ cmd: 'SUSPENDED_INFLUENCER' }, { influencerId }),
    );

    if (!response.status) {
      throw new WsException(response.error);
    }

    return response.data;
  }
  
  async isSuspendedCreator(creatorId: string) {

    const response: MSResponse = await firstValueFrom(
      this.creatorClient.send({ cmd: 'SUSPENDED_CREATOR' }, { creatorId }),
    );

    if (!response.status) {
      throw new WsException(response.error);
    }

    return response.data;
  }
  
}
