// js/config.js — Supabase client setup
// ⚠️  Replace these with your real values from .env or Supabase dashboard
//     NEVER commit real keys to GitHub — use this file locally only

const SUPABASE_URL = "https://ixnljlopdgzgyxbgmvpe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmxqbG9wZGd6Z3l4YmdtdnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTk5MzIsImV4cCI6MjA5MDI3NTkzMn0.w5ysD9HUEdw3ktZBjb29EK3qktZiw02IutJQKjJp7-k";

const EDAMAM_APP_ID  = "e1e91171";
const EDAMAM_APP_KEY = "5bc543f72920874f55ea39c8010bb4df";

// Claude API key is used ONLY in the Node.js backend (server.js)
// It is never exposed in frontend JS

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
