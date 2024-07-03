import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Types, model, Model, PaginateModel } from 'mongoose';
import { NextFunction } from 'express';

import { CREATE_SCHEMA, customPropsDefault } from '@core/utils/models';
import { nanoid } from 'nanoid';

interface ChatModelInterface extends Model<Chat>, PaginateModel<Chat> { }

/**
 * @class
 * @description typical mongoose schema definition stating the accurate data structure of each field in the document
 * @exports mongooseSchema
 * @extends Mongoose_DOCUMENT_INTERFACE
 */

@Schema(customPropsDefault([]))
export class Chat extends Document {
  @Prop({ default: () => nanoid(12), unique: true })
  readonly chatId: string;

  @Prop({ required: [true, 'Creator Is Required!'] })
  readonly creatorId: string;

  @Prop({ required: [true, 'Influencer Is Required!'] })
  readonly influencerId: string;

  @Prop({ required: [true, 'Creator User Id Is Required!'] })
  readonly creatorUserId: string;

  @Prop({ required: [true, 'Influencer User Id Is Required!'] })
  readonly influencerUserId: string;

  @Prop({
    default: 0,
  })
  readonly unreadByCreator: number;

  @Prop({
    default: 0,
  })
  readonly unreadByInfluencer: number;

  @Prop({
    default: false,
  })
  readonly blockedByCreator: boolean;

  @Prop({
    default: false,
  })
  readonly blockedByInfluencer: boolean;
}

const ChatModelName = Chat.name;
const ChatSchema = CREATE_SCHEMA<Chat>(Chat);

ChatSchema.index({ chatId: 1 });
ChatSchema.index({ creatorId: 1, influencerId: 1 }, { unique: true });

ChatSchema.pre('save', async function (next: NextFunction) {
  if (this.isNew) {
  }

  next();
});

ChatSchema.pre(
  /update|updateOne|findOneAndUpdate|findByIdAndUpdate/,
  async function () {
    const chat: any = this;

    const query = chat._conditions;

    const updateFields = chat._update;
  },
);

const ChatModel = { name: ChatModelName, schema: ChatSchema };

export { ChatSchema, ChatModelName, ChatModel, ChatModelInterface };
