
YAKhltv — Combined-style (Option C) GitHub-ready project

This archive contains a Node.js + Express API (server.js) and a public frontend (public/).
It is prepared for deployment on Render.com or similar services.

Run locally:
1. npm install
2. npm run initdb (if exists) or ensure data/db.sqlite present
3. npm start
4. Open http://localhost:3000/public/index.html

Admin login:
POST /api/login with { "password": "111" } returns a JWT token used by frontend

