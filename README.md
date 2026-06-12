# Chatbot Diff AI

Chatbot-Diff là server AI độc lập cho website Gym Diff. Gym Diff chỉ gọi API đến server này, không gọi Gemini/OpenAI trực tiếp và không lưu dữ liệu chatbot.

## Tính Năng

- Node.js + Express backend.
- Admin dashboard HTML/CSS/JavaScript thuần, giao diện tối nhẹ kiểu SaaS.
- Đăng nhập/đăng xuất admin bằng JWT cookie httpOnly.
- Password admin hash bằng bcrypt.
- API key AI mã hóa AES-256-GCM trước khi lưu local JSON.
- Gemini là provider chính, có cấu trúc OpenAI và Custom API.
- Knowledge Base upload tài liệu và nhập FAQ thủ công.
- Training/RAG local: extract text, split chunks, gắn metadata, lưu JSON.
- Chat API dùng chunk liên quan làm context cho AI.
- Logs cơ bản không lưu key/token/password.
- CORS theo Allowed Origin và rate limit cho `/api/chat`.
- Deploy được lên Vercel, Render hoặc VPS.

## Cấu Trúc

```txt
chatbot-diff/
├─ server.js
├─ package.json
├─ .env.example
├─ README.md
├─ src/
│  ├─ config/env.js
│  ├─ middleware/auth.js
│  ├─ middleware/cors.js
│  ├─ middleware/rateLimit.js
│  ├─ middleware/errorHandler.js
│  ├─ routes/auth.routes.js
│  ├─ routes/admin.routes.js
│  ├─ routes/chat.routes.js
│  ├─ routes/knowledge.routes.js
│  ├─ routes/widget.routes.js
│  ├─ services/ai.service.js
│  ├─ services/gemini.service.js
│  ├─ services/openai.service.js
│  ├─ services/crypto.service.js
│  ├─ services/knowledge.service.js
│  ├─ services/training.service.js
│  ├─ storage/config.store.js
│  ├─ storage/knowledge.store.js
│  ├─ storage/logs.store.js
│  └─ utils/response.js
├─ public/
│  ├─ index.html
│  ├─ login.html
│  ├─ admin.html
│  ├─ assets/style.css
│  ├─ assets/app.js
│  ├─ assets/login.js
│  ├─ assets/admin.js
│  └─ widget/chatbot.js
└─ uploads/.gitkeep
```

## Cài Đặt

```bash
npm install
copy .env.example .env
npm run dev
```

Chạy production:

```bash
npm start
```

Mở:

```txt
http://localhost:3000
http://localhost:3000/login
http://localhost:3000/admin
```

## Cấu Hình `.env`

```env
PORT=3000
NODE_ENV=development

ADMIN_EMAIL=admin@diffgym.local
ADMIN_PASSWORD=ChangeMe123

JWT_SECRET=change_this_secret
ENCRYPTION_KEY=change_this_32_char_key

AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

ALLOWED_ORIGIN=https://gym-diff.vercel.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_CONFIG_TABLE=chatbot_config
```

Đổi `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_PASSWORD` trước khi deploy production.

## Lưu Config Bền Trên Vercel Bằng Supabase

Vercel serverless không lưu bền file JSON local. Nếu muốn API key, trạng thái Active và cấu hình chatbot không mất sau F5/cold start/redeploy, hãy dùng Supabase.

Tạo bảng trong Supabase SQL Editor:

```sql
create table if not exists public.chatbot_config (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz default now()
);
```

Thêm Environment Variables vào Vercel project `Chatbot-Diff`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_CONFIG_TABLE=chatbot_config
```

Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào Gym Diff frontend. Key này chỉ được đặt trong backend Chatbot-Diff.

## Tạo Gemini API Key

1. Vào Google AI Studio.
2. Tạo API key mới.
3. Thêm vào `.env` hoặc nhập trong Admin > AI Config.
4. Model mặc định: `gemini-2.5-flash`.

## API Public

### Health Check

```txt
GET /api/health
```

### Public Config

```txt
GET /api/public-config
```

Response:

```json
{
  "botName": "Diff Coach",
  "welcomeMessage": "...",
  "status": "active"
}
```

### Chat API

```txt
POST /api/chat
```

Body:

```json
{
  "message": "Tôi nên tập ngực thế nào?",
  "userId": "optional",
  "source": "gym-diff"
}
```

Response:

```json
{
  "success": true,
  "reply": "Bạn có thể bắt đầu với..."
}
```

## Kết Nối Gym Diff

Gym Diff không gọi Gemini/OpenAI trực tiếp. Chỉ gọi Chatbot-Diff:

```ts
async function sendToDiffChatbot(message) {
  const res = await fetch("https://chatbot-diff-domain.com/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      source: "gym-diff"
    })
  });

  const data = await res.json();
  return data.reply;
}
```

## Admin Dashboard

Đăng nhập tại:

```txt
/login
```

Các trang quản trị:

- Dashboard
- AI Config
- Knowledge Base
- Training Data
- API Access
- Chat Test
- Logs
- Settings

## Upload Dữ Liệu Huấn Luyện

Admin > Knowledge Base:

- Upload `.txt`, `.md`, `.json`, `.csv`, `.pdf`, `.docx`.
- Nhập FAQ thủ công.
- Nhấn Training Data > `Process Documents` để tạo chunks.

Ghi chú: `.txt`, `.md`, `.json`, `.csv` được extract text local ngay. `.pdf` và `.docx` hiện lưu file/metadata trước để sẵn sàng gắn parser chuyên dụng sau.

## Pipeline RAG Local

1. Upload tài liệu.
2. Extract text.
3. Split text thành chunk khoảng 500-1000 từ.
4. Gắn metadata `title`, `source`, `category`, `created_at`, `updated_at`.
5. Lưu local JSON trong `data/training.json`.
6. Khi chat, tìm chunk liên quan bằng keyword score.
7. Đưa context vào prompt AI.

Cấu trúc này sẵn sàng thay bằng Supabase Vector, Pinecone, Chroma hoặc OpenAI Vector Store.

## Test Bằng Curl

Health:

```bash
curl http://localhost:3000/api/health
```

Chat:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Tôi nên tập ngực thế nào?\",\"source\":\"gym-diff\"}"
```

Login admin:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@diffgym.local\",\"password\":\"ChangeMe123\"}"
```

## Deploy Vercel

Repo có `vercel.json` route toàn bộ request về `server.js`.

1. Import repo `DiWien/Chatbot-Diff` vào Vercel.
2. Framework Preset: Other.
3. Thêm Environment Variables như `.env.example`.
4. Deploy.

Lưu ý: Vercel serverless không phù hợp để lưu file JSON/upload lâu dài. Production có dữ liệu huấn luyện nên dùng Render/VPS hoặc chuyển storage sang Supabase/PostgreSQL/Object Storage.

## Deploy Render

Build command:

```bash
npm install
```

Start command:

```bash
npm start
```

Thêm Environment Variables giống `.env.example`.

## Bảo Mật

- Không commit `.env`.
- Không đưa Gemini/OpenAI API key vào Gym Diff frontend.
- API key mã hóa khi lưu local JSON.
- Frontend admin chỉ nhận key dạng mask.
- Password admin được hash bằng bcrypt.
- Session admin dùng JWT cookie httpOnly.
- Logs không lưu key/token/password.
- CORS giới hạn theo `ALLOWED_ORIGIN`.
- `/api/chat` có rate limit.

## Scripts

```bash
npm install
npm run dev
npm start
```
