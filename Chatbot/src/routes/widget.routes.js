import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const router = express.Router();

router.get('/chatbot.js', (req, res) => res.sendFile(path.join(rootDir, 'public', 'widget', 'chatbot.js')));
router.get('/chatbot.css', (req, res) => res.sendFile(path.join(rootDir, 'public', 'widget', 'chatbot.css')));

export default router;
