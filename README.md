# resume-ranker-client
AI-powered resume ranking frontend application that analyzes and scores resumes based on job descriptions using modern web technologies.

## Vercel Deployment

This app is a client-side React Router SPA, so Vercel needs a rewrite to `index.html` for deep links and page refreshes. The included `vercel.json` handles that.

Set these environment variables in Vercel before deploying:

- `VITE_API_BASE_URL` for the backend API root, for example `https://your-backend.example.com/api/v1/`
- `VITE_BACKEND_ORIGIN` if your backend serves uploads or OTP endpoints from the site origin, for example `https://your-backend.example.com`

If `VITE_API_BASE_URL` is not provided, the app falls back to the local development backend URL.
