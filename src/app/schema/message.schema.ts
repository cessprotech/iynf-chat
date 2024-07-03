import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Types, model, Model, PaginateModel } from 'mongoose';
import { NextFunction } from 'express';

import { CREATE_SCHEMA, customPropsDefault } from '@core/utils/models';
import { nanoid } from 'nanoid';

interface MessageModelInterface extends Model<Message>, PaginateModel<Message> { }

/**
 * @class
 * @description typical mongoose schema definition stating the accurate data structure of each field in the document
 * @exports mongooseSchema
 * @extends Mongoose_DOCUMENT_INTERFACE
 */

@Schema(customPropsDefault([]))
export class Message extends Document {
  @Prop({ default: () => nanoid(12), unique: true })
  readonly messageId: string;

  @Prop({ required: [true, 'Chat Is Required!'] })
  readonly chatId: string;

  @Prop({ required: [true, 'Author Is Required!'] })
  readonly authorId: string;

  @Prop({ required: [true, 'text Is Required!'] })
  readonly text: string;

  @Prop({ required: [true, 'Author User Id Is Required!'] })
  readonly authorUserId: string;

  @Prop({
    default: false,
  })
  readonly blockedByRecipient: boolean;

  @Prop({
    default: false,
  })
  readonly isCompleteMessage: boolean;
}

const MessageModelName = Message.name;
const MessageSchema = CREATE_SCHEMA<Message>(Message);

MessageSchema.index({ messageId: 1 });
MessageSchema.index({ chatId: 1 });

MessageSchema.pre('save', async function (next: NextFunction) {
  if (this.isNew) {
  }

  next();
});

MessageSchema.pre(
  /update|updateOne|findOneAndUpdate|findByIdAndUpdate/,
  async function () {
    const message: any = this;

    const query = message._conditions;

    const updateFields = message._update;
  },
);

const MessageModel = { name: MessageModelName, schema: MessageSchema };

export { MessageSchema, MessageModelName, MessageModel, MessageModelInterface };
