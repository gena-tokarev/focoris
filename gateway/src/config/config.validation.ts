import * as Joi from 'joi';

export const validationSchema = Joi.object({
  AUTH_API_URL: Joi.string().uri().required(),
  SKILL_BOOK_API_URL: Joi.string().uri().required(),
});
