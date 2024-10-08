import { Injectable } from '@nestjs/common';
import { InjectConfigValidation } from '@core/config';
import * as Joi from 'joi';

@Injectable()
export class AppEnvClass {
  APP_NAME = Joi.string().required();

  APP_VERSION = Joi.string().required();

  APP_DESCRIPTION = Joi.string().required();

  DOCS_ROUTE = Joi.string().required();

  SENTRY_DSN = Joi.string();

  HOST = Joi.string().default('http://localhost');

  PORT = Joi.number().default(5046);

  REDIS_CLOUD = Joi.string().required();

  RMQ_URI = Joi.string().required();

  RMQ_CHAT_QUEUE = Joi.string().required();

  AUTH_TYPE = Joi.string().equal('jwt', 'ssa').required();

  NODE_ENV = Joi.string().equal('production', 'development').required();

  MONGO_STORE_SECRET = Joi.string().required();

  MONGO_STORE_TTL = Joi.number().required();

  EXPRESS_SESSION_SECRET = Joi.string().required();

  EXPRESS_SESSION_NAME = Joi.string().required();

  EXPRESS_COOKIE_MAX_AGE = Joi.number().required();

  JWT_SECRET = Joi.string();
  JWT_EXPIRES = Joi.string().default('4y');

  AWS_REGION = Joi.string().required();
  AWS_ACCESS_KEY_ID = Joi.string().required();
  AWS_ACCESS_KEY_SECRET = Joi.string().required();
  AWS_BUCKET_NAME = Joi.string().required();

  RMQ_INFLUENCER_QUEUE = Joi.string().required();
  INFLUENCER_SERVICE = Joi.string().default('INFLUENCER_SERVICE');

  RMQ_CREATOR_QUEUE = Joi.string().required();
  CREATOR_SERVICE = Joi.string().default('CREATOR_SERVICE');

  NOTIFICATION_SERVICE = Joi.string().default('NOTIFICATION_SERVICE');
  RMQ_NOTIFICATION_QUEUE = Joi.string().required();

  USER_SERVICE = Joi.string().default('USER_SERVICE');
  RMQ_USER_QUEUE = Joi.string().required();

  // GOOGLE_CLIENT_ID = Joi.string().required();
  // GOOGLE_CLIENT_SECRET = Joi.string().required();
  // GOOGLE_REDIRECT_URI = Joi.string().required();
  
  // API_KEY = Joi.string().required();
  // APP_ID = Joi.string().required();

}

export const APP_ENV = InjectConfigValidation<AppEnvClass>(
  'app',
  new AppEnvClass(),
);
