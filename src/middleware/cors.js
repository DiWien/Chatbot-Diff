import cors from 'cors';
import { getSafeConfig } from '../storage/config.store.js';

export const apiCors = cors({
  origin(origin, callback) {
    const config = getSafeConfig();
    const allowed = config.allowedOrigin;

    if (!origin || origin === allowed) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Client-Secret'],
});
