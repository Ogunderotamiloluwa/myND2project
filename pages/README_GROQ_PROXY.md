Quick GROQ proxy (Express)

What this does

- Provides a small Express server with a POST /api/chat endpoint.
- Reads GROQ API URL and API key from environment variables and forwards requests to that endpoint.

Files added

- `server.js` - the proxy server
- `package.json` - dependencies and scripts
- `.env.example` - example env file
- `.gitignore` - ignores node_modules and .env

Setup

1. Install dependencies

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill values (do NOT commit `.env`):

```text
GROQ_API_URL=https://api.groq.example/v1/chat
GROQ_API_KEY=YOUR_KEY_HERE
PORT=3000
```

3. Start the server (dev):

```bash
npm run dev
```

Usage

- POST /api/chat
  - body: { prompt: string, chatHistory?: array, profile?: object }
  - response: proxied response from GROQ endpoint

Security notes

- Never commit your `.env` or API keys. Rotate keys if they are exposed.
