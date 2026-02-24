# AI-POWERED-CHATBOT-FOR-CAMPUS-FAQS

Campus FAQ chatbot with:
- Normal AI chat
- College FAQ chat (DB-backed)
- User and admin login
- Admin dashboard CRUD
- File upload + explanation

## Local run
1. Install dependencies:
   - `pip install -r requirements.txt`
2. Set environment variables (or create `.env` from `.env.example`):
   - `OPENROUTER_API_KEYS`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
3. Start app:
   - `python app.py`

## Default admin login
- Email: `admin@gmail.com`
- Password: `admin123`

Change these using env vars in production.

## Deploy online (Render)
1. Push this project to GitHub.
2. In Render: New -> Web Service -> connect your repo.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`
5. Add env vars in Render dashboard:
   - `OPENROUTER_API_KEYS`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
6. Deploy.

Your app will be live on a Render URL after deploy.
