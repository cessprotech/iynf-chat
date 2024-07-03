import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from '@core/common/interceptors/response';
import {
  HttpValidationFilter,
  MongooseExceptionFilter,
} from '@core/common/filters';
import { ApiTags } from '@nestjs/swagger';
import { TAGS } from '@app/common/constants';
import { LogService, Logger } from '@core/logger';
import { CHAT_RESPONSE } from './app.response';
import { CreateChatDto, UpdateChatDto } from './app.dto';
import { DeepRequired } from 'ts-essentials';

import { Iam, Protect, Public } from '@core/auth/decorators';
import { APP_CONFIG } from './app.constants';

@Protect()
@ApiTags(`${TAGS.DEFAULT}/ME`)
@UseFilters(HttpValidationFilter)
@UseFilters(MongooseExceptionFilter)
@Controller(`me`)
// @UsePipes(ZodValidationPipe)
export class MeController {
  @Logger(MeController.name) private logger = new LogService();

  constructor(
    private readonly appService: AppService,
  ) {}
  @Post()
  @Response(CHAT_RESPONSE.CREATE)
  createChat(@Body() body: CreateChatDto, @Req() req) {
    let createChatDto = body as unknown as DeepRequired<CreateChatDto>;

    return this.appService.create(createChatDto);
  }
}
