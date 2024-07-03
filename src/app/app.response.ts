import { BaseResponses } from '@app/common/helpers';

export const CHAT_RESPONSE = {
  ...BaseResponses('Chat'),

  ERROR: {
    NOT_FOUND: 'Chat not found.',
    EXIST: 'Chat exists.',
  },

  LOG: {
    CREATE: 'Chat created.',
  },
};

export const MESSAGE_RESPONSE = {
  ...BaseResponses('Message'),

  ERROR: {
    NOT_FOUND: 'Message not found.',
    EXIST: 'Message exists.',
  },

  LOG: {
    CREATE: 'Message created.',
  },
};
