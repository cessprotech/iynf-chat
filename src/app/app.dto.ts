import { createZodDto } from '@anatine/zod-nestjs';
import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';
import { ZodRequired } from './common/helpers';

const CreateChat = extendApi(
  z.object({
    creatorId: z.string().min(1),
    creatorUserId: z.string().min(1),
    influencerId: z.string().min(1),
    influencerUserId: z.string().min(1),
  }),
  {
    title: 'Chat Data',
    description: 'Chat Data',
  },
);

export class CreateChatDto extends createZodDto(CreateChat.strict()) { }

// export type CreateChatDto = DeepRequired<CreateChatDtoClass>

export class UpdateChatDto extends createZodDto(CreateChat.deepPartial()) { }

const CreateMessage = extendApi(
  z.object({
    chatId: z.string().min(1),
    authorId: z.string().min(1),
    text: z.string().min(1),
  }),
  {
    title: 'Message Data',
    description: 'Message Data',
  },
);

export class CreateMessageDto extends createZodDto(CreateMessage.strict()) { }

// export type CreateChatDto = DeepRequired<CreateChatDtoClass>

export class UpdateMessageDto extends createZodDto(CreateMessage.deepPartial()) { }


const UploadBannerUrl = extendApi(
  z.object({
    title: z.string().min(1),
    contentType: z.string().min(1),
  }),
  {
    title: 'Content Upload Data',
    description: 'Content Upload Data',
  },
);

export class UploadBannerUrlDto extends createZodDto(
  UploadBannerUrl.strict(),
) { }
