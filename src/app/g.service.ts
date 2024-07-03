// import { Injectable } from '@nestjs/common';
// import { google } from 'googleapis';
// import { APP_CONFIG } from './app.constants';
// import { ConfigService } from '@nestjs/config';
// import * as https from 'https';

// const config_service = new ConfigService();

// @Injectable()
// export class GService {
  
//   private readonly API_KEY = config_service.get<string>(APP_CONFIG.API_KEY);
  
//   sendNotification(data: any): Promise<any> {
//     const url = 'https://onesignal.com/api/v1/notifications';
//     const options = {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json; charset=utf-8',
//         'Authorization': `Basic ${this.API_KEY}`,
//       },
//     };

//     return new Promise((resolve, reject) => {
//       const req = https.request(url, options, (res) => {
//         let responseData = '';

//         res.on('data', (chunk) => {
//           responseData += chunk;
//         });

//         res.on('end', () => {
//           if (res.statusCode === 200 || res.statusCode === 201) {
//             try {
//               const result = JSON.parse(responseData);
//               resolve(result);
//             } catch (err) {
//               reject(err);
//             }
//           } else {
//             reject(new Error('Error sending notification: ' + responseData));
//           }
//         });
//       });

//       req.on('error', (err) => {
//         reject(err);
//       });

//       req.write(JSON.stringify(data));
//       req.end();
//     });
//   }
// }
