import { TAGS } from '@app/common/constants';
import {
  HttpValidationFilter,
  MongooseExceptionFilter,
} from '@core/common/filters';
import { Response } from '@core/common/interceptors/response';
import { LogService, Logger } from '@core/logger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseFilters
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiTags } from '@nestjs/swagger';
import { DeepRequired } from 'ts-essentials';
import { CreateChatDto, CreateMessageDto } from './app.dto';
import { CHAT_RESPONSE, MESSAGE_RESPONSE } from './app.response';
import { AppService } from './app.service';
import { QueryOptions } from './common/helpers';
import { Protect, Public } from '@core/auth/decorators';

@Protect()
@ApiTags(TAGS.DEFAULT)
@UseFilters(HttpValidationFilter)
@UseFilters(MongooseExceptionFilter)
@Controller()
// @UsePipes(ZodValidationPipe)
export class AppController {
  @Logger(AppController.name) private logger = new LogService();

  constructor(
    private readonly appService: AppService,
    private eventEmitter: EventEmitter2,

  ) { }

  @Get('influencers')
  @Response(CHAT_RESPONSE.FIND_ALL)
  async getAllInfluencers(@Query() query, @Req() req) {
    const { otherQuery, paginateOptions } = QueryOptions(query, true);

    paginateOptions.populate = [
      { path: 'messages', match: { blockedByRecipient: false }, options: { limit: 2 } },
      { path: 'creatorUser', unwindType: 1 },
      { path: 'influencerUser', unwindType: 1 }
    ];

    otherQuery.creatorUserId = req.user.userId;
    return await this.appService.getAll(otherQuery, paginateOptions);
  }

  @Get('creators')
  @Response(CHAT_RESPONSE.FIND_ALL)
  async getAllCreators(@Query() query, @Req() req) {
    const { otherQuery, paginateOptions } = QueryOptions(query, true);

    paginateOptions.populate = [
      { path: 'messages', match: { blockedByRecipient: false }, options: { limit: 2 } },
      { path: 'creatorUser', unwindType: 1 },
      { path: 'influencerUser', unwindType: 1  }
    ];

    otherQuery.influencerUserId = req.user.userId;
    return await this.appService.getAll(otherQuery, paginateOptions);
  }

  @Post('find/create')
  @Response(CHAT_RESPONSE.CREATE)
  async createChat(@Body() body: DeepRequired<CreateChatDto>, @Req() req) {

    const chat = await this.appService.create(body);

    return chat;
  }

  @Get(':chatId/get')
  @Response(CHAT_RESPONSE.FIND_ONE_BY_ID)
  async getChat(@Param('chatId') chatId: string, @Req() req) {

    return await this.appService.getMyChat(chatId, req.user.userId, [
      { path: 'messages', match: { blockedByRecipient: false }, options: { limit: 50 } }
    ]);
  }

  @Post(':chatId/block')
  @Response(CHAT_RESPONSE.DEFAULT)
  blockChat(@Param('chatId') chatId: string, @Req() req) {
    return this.appService.block(chatId, req.user.userId);
  }

  @Post(':chatId/unblock')
  @Response(CHAT_RESPONSE.DEFAULT)
  unblockChat(@Param('chatId') chatId: string, @Req() req) {
    return this.appService.block(chatId, req.user.userId);
  }

  @Get(':chatId/messages')
  @Response(MESSAGE_RESPONSE.FIND_ALL)
  allMessages(@Param('chatId') chatId: string) {
    return this.appService.getAllMessages({ chatId });
  }

  @Post('message/send')
  @Response(MESSAGE_RESPONSE.CREATE)
  async createMessage(@Body() body: DeepRequired<CreateMessageDto>, @Req() req) {
    const { message, chat } = await this.appService.saveMessage({ ...body }, req.user.userId);

    this.eventEmitter.emit('message.create', { userId: req.user.userId, message: message, chat });

    return message;
  }


  @Delete(':chatId/message/:messageId/delete')
  @Response(MESSAGE_RESPONSE.DELETE)
  async deleteMessage(@Param('messageId') messageId: string, @Param('chatId') chatId: string, @Req() req) {
    const message = await this.appService.deleteMessage(messageId, chatId, req.user._id);

    return message;
  }
}
