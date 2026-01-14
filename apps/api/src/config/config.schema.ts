import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3001),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  CORS_ORIGIN: Joi.string().default('*'),
  DATABASE_URL: Joi.string().optional(),
  // JWT RS256 Asymmetric Keys (base64-encoded PEM)
  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_PUBLIC_KEY: Joi.string().required(),

  // AI/LLM Configuration
  ANTHROPIC_API_KEY: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .description('Anthropic API key for Claude models'),
  OPENAI_API_KEY: Joi.string()
    .optional()
    .description('OpenAI API key for embeddings and fallback'),

  // LLM Router Configuration
  LLM_PRIMARY_PROVIDER: Joi.string()
    .valid('anthropic', 'openai')
    .default('anthropic')
    .description('Primary LLM provider'),
  LLM_FALLBACK_ENABLED: Joi.boolean()
    .default(true)
    .description('Enable fallback to secondary provider on failure'),
});
