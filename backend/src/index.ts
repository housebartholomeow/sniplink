import express from 'express';
import cors from 'cors'
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { shortenUrl, redirectUrl } from './controllers/url.controller.ts';
import { redisClient } from './db/redis.ts';
import { checkAndRefillPool } from './services/kgs.service.ts';
import { connectKafka } from './services/kafka.service.ts';

const app = express();

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors())

app.use(express.json());

// Initialize Redis Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `windowMs`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  message: { error: "Too many requests, please try again later." }
});

// Apply rate limiting to the creation endpoint to prevent spam/API exhaustion
app.use('/api/shorten', limiter);

// 1. Route to create a new short URL
app.post('/api/shorten', shortenUrl);

// 2. Route to handle the redirect (e.g., localhost:3000/sBc)
app.get('/:shortCode', redirectUrl);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);

  // 2. Connect to external services in the background
  Promise.all([checkAndRefillPool(), connectKafka()])
    .then(() => {
      console.log('All external services connected successfully');
    })
    .catch((error) => {
      // Prevents the container from crashing if a service is temporarily down
      console.error('Failed to connect external services on startup:', error);
    });
});