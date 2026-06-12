import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './src/config/env.js';
import { publicCors, apiCors } from './src/middleware/cors.js';
import { chatLimiter } from './src/middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/auth.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import chatRoutes from './src/routes/chat.routes.js';
import knowledgeRoutes from './src/routes/knowledge.routes.js';
import widgetRoutes from './src/routes/widget.routes.js';
import { ensureConfig } from './src/storage/config.store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await ensureConfig();

const app = express();

app.disable('x-powered-by');
app.use(publicCors);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/admin/knowledge', knowledgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', apiCors, chatLimiter, chatRoutes);
app.use('/widget', widgetRoutes);

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use(notFoundHandler);
app.use(errorHandler);

if (env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`Chatbot Diff AI running on port ${env.PORT}`);
  });
}

export default app;
