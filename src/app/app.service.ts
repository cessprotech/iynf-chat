import { Connection, Model, PaginateModel, PaginateOptions } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { CreateChatDto, CreateMessageDto, UpdateChatDto } from './app.dto';
import { Chat, ChatModelInterface } from './app.schema';
import { addDays } from 'date-fns';
import { DeepRequired } from 'ts-essentials';
import { CHAT_RESPONSE } from './app.response';
import { LogService, Logger } from '@core/logger';
import { CustomPopulateOptions, PopulateOptions } from './common/helpers';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { APP_CONFIG } from './app.constants';
import { AppPipeline } from './app.pipeline';
import { Socket } from 'socket.io';
import { MSResponse } from '@core/common/interfaces';
import { WsException } from '@nestjs/websockets';
import { Message, MessageModelInterface } from './schema/message.schema';
import { Online, OnlineModelInterface } from './schema/online.schema';
// import { CachingService } from '@libs/modules/caching';

@Injectable()
export class AppService {
  @Logger(AppService.name) private logger = new LogService();

  constructor(
    @InjectConnection() private readonly connection: Connection,

    @InjectModel(Chat.name) public readonly chatModel: ChatModelInterface,

    @InjectModel(Message.name) public readonly messageModel: MessageModelInterface,

    @InjectModel(Online.name) public readonly onlineModel: OnlineModelInterface,

    @Inject(APP_CONFIG.USER_SERVICE) private readonly userClient: ClientProxy,

    @Inject(APP_CONFIG.NOTIFICATION_SERVICE)
    private readonly notificationClient: ClientProxy,
    // private cache: CachingService,
    private eventEmitter: EventEmitter2,
  ) { }

  async create(
    createChatDto: DeepRequired<CreateChatDto>,
  ) {
    const query = {
      creatorId: createChatDto.creatorId, influencerId: createChatDto.influencerId
    }

    let chat = await this.chatModel.findOne(query)

    if (!chat) {
      chat = await this.chatModel.create(createChatDto);

      this.eventEmitter.emit(CHAT_RESPONSE.LOG.CREATE, chat);
    }

    return chat;
  }

  async getAll(
    query?: Record<string, any>,
    paginateOptions: PaginateOptions = {},
  ) {
    const { page, limit, select, sort, ...rest } = query;

    // return await AppPipeline(this.chatModel).getAll(rest, paginateOptions);
    const result = await AppPipeline(this.chatModel).getAll(rest, paginateOptions);

    // Get chat IDs to fetch last messages in bulk
    const chatIds = result.docs.map((chat: any) => chat.chatId); 

    // Retrieve last messages for all chats in one query
    const lastMessages = await this.messageModel.aggregate([
      { $match: { chatId: { $in: chatIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$chatId", text: { $first: "$text" }, createdAt: { $first: "$createdAt" } } }
    ]);

    // Map the last messages by chatId for quick access
    const lastMessagesMap = lastMessages.reduce((map: any, message: any) => {
      map[message._id] = message;
      return map;
    }, {});   

    // Update chats with their last message and time
    const updatedChats = result.docs.map((chat: any) => {
      const lastMessage = lastMessagesMap[chat.chatId] || {};
      return {
        ...chat,
        lastMessage: lastMessage.text || null,
        lastMessageTime: lastMessage.createdAt || null,
      };
    });

    return {
      ...result,
      docs: updatedChats,
    };
  }

  async getOne(id: string, populateOptions: CustomPopulateOptions[] = []) {
    const query = {
      $or: [
        { _id: id || '' },
        { chatId: id || '' },
      ],
    };

    const chat = await AppPipeline(this.chatModel).getOne(
      query,
      populateOptions,
    );

    if (!chat) {
      throw new NotFoundException('Chat Not Found');
    }

    return chat;
  }

  async getMyChat(id: string, userId: string, populateOptions: PopulateOptions = []) {
    const query = {
      $or: [
        { _id: id || '' },
        { chatId: id || '' },
      ],
    };

    const chat = await AppPipeline(this.chatModel).getOne(
      query,
      populateOptions,
    ) as unknown as Chat;

    if (!chat) {
      throw new NotFoundException('Chat Not Found');
    }

    if (chat.creatorUserId !== userId && chat.influencerUserId !== userId) throw new InternalServerErrorException('Wrong Chat');

    return chat;
  }

  async saveMessage(
    saveMessageDto: CreateMessageDto & { authorId: string }, userId: string
  ) {

    const chat = await this.getMyChat(saveMessageDto.chatId, userId);

    let blockedByRecipient = false
    let authorUserId = '';
    let updateFields = {};


    if (chat.creatorId === saveMessageDto.authorId) {
      authorUserId = chat.creatorUserId;
      if (chat.blockedByCreator) blockedByRecipient = true;

      updateFields = { $inc: { unreadByCreator: 1 } };
    }
    else if (chat.influencerId === saveMessageDto.authorId) {
      authorUserId = chat.influencerUserId;
      if (chat.blockedByInfluencer) blockedByRecipient = true;
      updateFields = { $inc: { unreadByInfluencer: 1 } };
    }

    const message = await this.messageModel.create({ ...saveMessageDto, authorUserId, blockedByRecipient });

    await this.chatModel.findOneAndUpdate({ chatId: chat.chatId }, updateFields);

    return { message, chat };
  }

  async getAllMessages(
    query?: Record<string, any>,
    paginateOptions: PaginateOptions = {},
  ) {
    const { page, limit, select, sort, ...rest } = query;

    return await AppPipeline(this.messageModel).getAll(rest, paginateOptions);
  }

  async readAllMessages(chatId: string, userId: string) {
    let chat = await this.getMyChat(chatId, userId);

    if (chat.creatorUserId === userId && chat.unreadByCreator > 0) await this.chatModel.findOneAndUpdate({ chatId, creatorUserId: userId }, { $set: { unreadByCreator: 0 } }, { new: true }).lean()

    else if (chat.influencerUserId === userId && chat.unreadByInfluencer > 0) await this.chatModel.findOneAndUpdate({ chatId, influencerUserId: userId }, { $set: { unreadByInfluencer: 0 } }, { new: true }).lean()

    return chat;
  }

  async deleteMessage(messageId: string, chatId: string, userId: string) {
    console.log('deletedid', userId);
    
    // return await this.messageModel.findOneAndDelete({ messageId, chatId, authorId: userId });
    return { message: 'under test' }
  }

  remove(id: string) {
    return `This action removes a #${id} chat`;
  }

  async block(id: string, userId: string) {
    const chat = await this.getMyChat(id, userId);

    if (chat.creatorUserId === userId) await this.chatModel.findOneAndUpdate({ chatId: chat.chatId }, { $set: { blockedByCreator: true } }, { new: true });
    else if (chat.influencerUserId === userId) await this.chatModel.findOneAndUpdate({ chatId: chat.chatId }, { $set: { blockedByInfluencer: true } }, { new: true });

    return chat;
  }

  async unblock(id: string, userId: string) {
    const chat = await this.getMyChat(id, userId);

    if (chat.creatorUserId === userId) await this.chatModel.findOneAndUpdate({ chatId: chat.chatId }, { $set: { blockedByCreator: false } }, { new: true });
    else if (chat.influencerUserId === userId) await this.chatModel.findByIdAndUpdate(chat.id, { $set: { blockedByInfluencer: false } }, { new: true });

    return chat;
  }
}
