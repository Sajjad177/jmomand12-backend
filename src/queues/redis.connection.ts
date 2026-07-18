import { RedisOptions } from 'bullmq';
import config from '../config';

export const redisConnection: RedisOptions = {
  url: config.redis.url,
  maxRetriesPerRequest: null,
};
