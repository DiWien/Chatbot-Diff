import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './src/config/env.js';
import { apiCors } from './src/middleware/cors.js';
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
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/admin/knowledge', knowledgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', apiCors, chatRoutes);
app.use('/widget', widgetRoutes);

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/image.png', (req, res) => {
  res
    .type('svg')
    .send('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="100%" height="100%" fill="#070b12"/><text x="80" y="330" fill="#ff7a1a" font-size="72" font-family="Arial">Chatbot Diff AI</text></svg>');
});

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use(notFoundHandler);
app.use(errorHandler);

if (env.NODE_ENV !== 'test' && !env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Chatbot Diff AI running on port ${env.PORT}`);
  });
}

export default app;
