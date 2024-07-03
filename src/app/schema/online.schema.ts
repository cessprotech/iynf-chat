import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Types, model, Model, PaginateModel } from 'mongoose';
import { NextFunction } from 'express';

import { CREATE_SCHEMA, customPropsDefault } from '@core/utils/models';
import { nanoid } from 'nanoid';

interface OnlineModelInterface extends Model<Online>, PaginateModel<Online> {}

/**
 * @class
 * @description typical mongoose schema definition stating the accurate data structure of each field in the document
 * @exports mongooseSchema
 * @extends Mongoose_DOCUMENT_INTERFACE
 */

@Schema(customPropsDefault([]))
export class Online extends Document {
  @Prop({ required: [true, 'User Is Required!'], unique: true })
  readonly userId: string;
  
  @Prop({ required: [true, 'Socket Id Is Required!'], unique: true })
  readonly socketId: string;
}

const OnlineModelName = Online.name;
const OnlineSchema = CREATE_SCHEMA<Online>(Online);

OnlineSchema.index({ userId: 1 }, { unique: true });
OnlineSchema.index({ socketId: 1 }, { unique: true });

OnlineSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'userId',
  justOne: true,
});

OnlineSchema.pre('save', async function (next: NextFunction) {
  if (this.isNew) {
  }

  next();
});

OnlineSchema.pre(
  /update|updateOne|findOneAndUpdate|findByIdAndUpdate/,
  async function () {
    const online: any = this;

    const query = online._conditions;

    const updateFields = online._update;
  },
);

const OnlineModel = { name: OnlineModelName, schema: OnlineSchema };

export { OnlineSchema, OnlineModelName, OnlineModel, OnlineModelInterface };
