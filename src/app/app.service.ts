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

    const updatedChats = await Promise.all(result.docs.map(async (chat) => {
      const lastMessage = await this.getLastMessage(chat._id);  // Assuming chat._id is the chat identifier
      const lastMessageTime = lastMessage ? lastMessage.createdAt : null;

      return {
        ...chat,
        lastMessage: lastMessage ? lastMessage.content : null,  // Assuming 'content' field exists in messages
        lastMessageTime,
      };
    }));

    // Update the result with the new chat data
    return {
      ...result,
      docs: updatedChats,
    };
  }

  async getLastMessage(chatId: string) {
    // Find the last message for the chat by sorting the messages by createdAt in descending order
    return await this.chatModel.findOne({ _id: chatId })
      .populate({
        path: 'messages',
        match: { blockedByRecipient: false },
        options: { sort: { createdAt: -1 }, limit: 1 }  // Fetch only the last message
      })
      .then(chat => chat?.messages[0]);  // Return the first message if exists
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
    return await this.messageModel.findOneAndDelete({ messageId, chatId, authorId: userId });
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
