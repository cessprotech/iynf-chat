import { Controller, Get, Query, Res, Next, Post, Body } from '@nestjs/common';
import { GService } from './g.service';
import { Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { APP_CONFIG } from './app.constants';


const config_service = new ConfigService();

const APP_ID = config_service.get<string>(APP_CONFIG.APP_ID);

@Controller('oauth')
export class GController {
  constructor(private readonly gService: GService) {}

  @Post('all')
  async sendAll(@Res() res: Response,  @Body() body: { [key: string]: string },@Next() next: NextFunction) {
    const message = {
      app_id: APP_ID,
      contents: body,
      included_segments: ['All'],
      content_available: true,
      small_icon: 'ic_notification_icon',
      data: {
        PushTitle: 'CUSTOM NOTIFICATION',
      },
    };

    try {
      const results = await this.gService.sendNotification(message);

      if (results.errors && results.errors.length > 0) {
        return res.status(400).send({
          message: 'failure',
          errors: results.errors,
        });
      }

      return res.status(200).send({
        message: 'success',
        data: results,
      });
    } catch (error) {
      return next(error);
    }
  }
}
