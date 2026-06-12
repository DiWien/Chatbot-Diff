# Chatbot Diff API

Server chatbot độc lập cho website Diff Gym. Web Gym Diff chỉ gọi API đến server này, không giữ API key AI và không lưu dữ liệu chatbot ở frontend.

## Kiến trúc

- Frontend Gym Diff deploy trên Vercel.
- Backend chatbot nằm trong repo `Chatbot-Diff`, chạy Node.js + Express.
- Database Gym Diff có thể dùng Supabase riêng, không bắt buộc cho chatbot API này.
- API key Gemini chỉ cấu hình trong server chatbot qua biến môi trường.
- Web Gym Diff gọi `POST /api/chat` qua CORS.
- Chatbot server chịu trách nhiệm gọi Gemini và trả lời.

## Tính năng

- `GET /` trả trạng thái server.
- `GET /api/health` kiểm tra server sống.
- `POST /api/chat` nhận câu hỏi và trả lời bằng tiếng Việt.
- Dùng Gemini API qua `@google/generative-ai`.
- Model mặc định: `gemini-2.5-flash`.
- Vai trò chatbot: Diff Coach.
- Ưu tiên nội dung gym, bài tập, lịch tập, dinh dưỡng và sử dụng Diff Gym.
- Nếu không có dữ liệu chắc chắn thì nói chưa có dữ liệu, không bịa.
- Có xử lý lỗi API key sai, hết quota/rate limit và timeout.
- Không log API key.
- CORS chỉ cho phép domain Gym Diff gọi.

## Cấu trúc File

```txt
Chatbot-Diff/
├─ package.json
├─ server.js
├─ .env.example
├─ vercel.json
└─ README.md
```

## Cài Đặt Local

Repo lưu local tại:

```txt
D:\Chatbot
```

Cài dependencies:

```bash
npm install
```

Tạo file `.env` từ `.env.example`:

```bash
copy .env.example .env
```

Cấu hình `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGIN=https://gym-diff.vercel.app
PORT=3000
```

Chạy dev:

```bash
npm run dev
```

Chạy production local:

```bash
npm start
```

Server local:

```txt
http://localhost:3000
```

## API

### `GET /`

Response:

```json
{
  "status": "ok",
  "service": "Chatbot Diff API"
}
```

### `GET /api/health`

Response:

```json
{
  "status": "ok",
  "service": "Chatbot Diff API",
  "timestamp": "2026-06-12T00:00:00.000Z"
}
```

### `POST /api/chat`

Request body:

```json
{
  "message": "Câu hỏi người dùng",
  "userId": "optional",
  "source": "gym-diff"
}
```

Success response:

```json
{
  "success": true,
  "reply": "Câu trả lời của chatbot"
}
```

Error response:

```json
{
  "success": false,
  "error": "GEMINI_API_ERROR",
  "reply": "Diff Coach chưa thể trả lời lúc này do lỗi từ dịch vụ AI."
}
```

## System Prompt

```txt
Bạn là Diff Coach, trợ lý AI của website Diff Gym. Bạn trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, thân thiện. Bạn hỗ trợ người dùng về tập luyện, bài tập, lịch tập, dinh dưỡng và sử dụng website Diff Gym. Nếu câu hỏi không có dữ liệu chắc chắn, hãy nói rõ là chưa có dữ liệu, không bịa thông tin.
```

## Gọi API Từ Web Gym Diff

Endpoint production sau khi deploy:

```txt
POST https://domain-chatbot-diff.vercel.app/api/chat
```

Ví dụ frontend Gym Diff:

```ts
fetch("https://domain-chatbot-diff.vercel.app/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: userMessage,
    source: "gym-diff"
  })
});
```

Ví dụ xử lý response:

```ts
const response = await fetch("https://domain-chatbot-diff.vercel.app/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: userMessage,
    source: "gym-diff"
  })
});

const data = await response.json();

if (data.success) {
  console.log(data.reply);
} else {
  console.error(data.error, data.reply);
}
```

Ví dụ local frontend gọi local backend:

```ts
fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: userMessage,
    source: "gym-diff"
  })
});
```

Khi chạy local frontend, đổi `.env` backend:

```env
ALLOWED_ORIGIN=http://localhost:5173
```

## Deploy Lên Vercel

Repo đã có `vercel.json` để route toàn bộ request về `server.js`.

Các bước:

1. Push repo lên GitHub: `https://github.com/DiWien/Chatbot-Diff`.
2. Vào Vercel Dashboard.
3. Import repo `Chatbot-Diff`.
4. Framework Preset chọn `Other` nếu Vercel không tự nhận diện.
5. Build Command để trống hoặc dùng `npm install`.
6. Output Directory để trống.
7. Thêm Environment Variables:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGIN=https://gym-diff.vercel.app
PORT=3000
```

Sau khi deploy, test:

```txt
https://domain-chatbot-diff.vercel.app/
https://domain-chatbot-diff.vercel.app/api/health
```

## Deploy Lên Render

Các bước:

1. Push repo lên GitHub: `https://github.com/DiWien/Chatbot-Diff`.
2. Render Dashboard > New > Web Service.
3. Connect repo `Chatbot-Diff`.
4. Runtime chọn Node.
5. Build command:

```bash
npm install
```

6. Start command:

```bash
npm start
```

7. Thêm Environment Variables:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGIN=https://gym-diff.vercel.app
PORT=3000
```

## Supabase

Backend database của Gym Diff có thể đặt trên Supabase, nhưng chatbot server này không cần lưu lịch sử chat theo yêu cầu hiện tại.

Nếu sau này muốn lưu lịch sử chat, hãy tạo API lưu ở backend riêng và không lưu trực tiếp từ frontend Gym Diff. Không đưa Supabase service role key hoặc Gemini API key vào frontend.

## Bảo Mật

- Không commit file `.env`.
- Không đưa `GEMINI_API_KEY` vào web Gym Diff.
- Không log API key.
- `ALLOWED_ORIGIN` nên đặt đúng domain production của Gym Diff.
- Nếu cần nhiều domain, nên mở rộng cấu hình bằng danh sách domain rõ ràng thay vì cho phép `*`.
- Rotate API key ngay nếu bị lộ.

## Scripts

```bash
npm install
npm run dev
npm start
```
