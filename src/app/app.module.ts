import { Module } from '@nestjs/common';
// import { WinstonModule } from 'nest-winston';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LogModule } from '@core/logger';
import { MessageModule } from '@core/modules/message';
// import { MiddlewareModule } from '@libs/modules/middleware';
import { EventEmitModule } from '@core/modules/event-emitter';

import { CONFIG_VALIDATORS } from '@core/config';
import { APP_ENV } from './app.config';
import { DB_CONNECTION, MODEL_INJECT } from '@core/modules/database';
import { ShutdownService } from './power.service';
// import { CachingModule } from '@libs/modules/caching/caching.module';
import { MicroServicesConfig } from './config.service';
import { ChatModel } from './app.schema';
import { ExternalModels } from './schema/externals.schema';
import { MeController } from './me.controller';
import { SentryInterceptor } from '@core/common/interceptors/sentry.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientMService } from './mservices/client.m.service';
import { MessageModel } from './schema/message.schema';
import { OnlineModel } from './schema/online.schema';
import { ChatGateway } from './app.gateway';
import { GatewaySessionManager } from './chat.session';
import { GController } from './g.controller';
import { GService } from './g.service';

@Module({
  imports: [
    DB_CONNECTION,

    MODEL_INJECT([
      ChatModel,
      MessageModel,
      OnlineModel,
      ...ExternalModels,
    ]),

    LogModule.forRoot(),

    ConfigModule.forRoot({
      load: [APP_ENV],
      envFilePath: '.env',
      validationSchema: CONFIG_VALIDATORS,
      cache: true,
      isGlobal: true,
    }),

    MicroServicesConfig(),

    // MiddlewareModule,

    MessageModule,
    //features
    EventEmitModule,
  ],

  controllers: [AppController, GController],

  providers: [
    AppService,
    GService,
    ShutdownService,
    ClientMService,
    GatewaySessionManager,
    ChatGateway,
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class AppModule { }
