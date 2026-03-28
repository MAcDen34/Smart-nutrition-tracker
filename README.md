# Smart Nutrition Tracker

> An AI-powered web application that tracks meals, analyzes nutrition, and provides personalized dietary insights using the Claude AI and Edamam Nutrition API.

---

# Project Overview

Smart Nutrition Tracker goes beyond basic calorie counting. It analyzes meals in natural language, provides real-time nutritional breakdowns, and uses AI to generate personalized dietary feedback. The app is designed with Rwandan and East African users in mind, with suggestions for local foods.

# Key Features
- Natural language meal analysis** — type "1 cup ugali with beans" and get instant nutrition data
- Dashboard** — live calorie ring, macro tracking, today's progress
- Meal history** — search and filter all logged meals by name or date
- AI Daily Insight** — Claude AI analyzes your day and gives actionable feedback
- AI Chat Coach** — ask any nutrition question and get personalized answers
- User authentication** — secure login/signup via Supabase Auth

---

# Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Auth + Database | [Supabase](https://supabase.com) |
| Nutrition API | [Edamam Nutrition Analysis API](https://developer.edamam.com) |
| AI Insights | [Anthropic Claude API](https://docs.anthropic.com) |
| Backend | Node.js (no frameworks) |
| Web Server | Nginx |

---

Running Locally

# Prerequisites
- Node.js v18+ installed (`node -v` to check)
- A Supabase project with the `meals` table (see schema below)
- Edamam API credentials
- Claude API key

# 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/smart-nutrition-tracker.git
cd smart-nutrition-tracker
```

### 2. Set Up Supabase

In your Supabase project, create the `meals` table:

```sql
create table meals (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users not null,
  food_name  text not null,
  calories   integer default 0,
  protein    integer default 0,
  carbs      integer default 0,
  fats       integer default 0,
  fiber      integer default 0,
  sugar      integer default 0,
  date       date default current_date,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table meals enable row level security;

-- Policy: users can only see their own meals
create policy "Users can manage own meals"
  on meals for all
  using (auth.uid() = user_id);
```

### 3. Configure Frontend

Edit `frontend/js/config.js` with your real credentials:
```js
const SUPABASE_URL    = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
const EDAMAM_APP_ID   = "YOUR_APP_ID";
const EDAMAM_APP_KEY  = "YOUR_APP_KEY";
```

### 4. Start the Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

CLAUDE_API_KEY=your_claude_api_key_here
PORT=3000


npm start

NutriTrack backend running on port 3000

# 5. Open the App

Open `frontend/index.html` in your browser (or use Live Server in VS Code).

---

## 🚢 Deployment (Part Two)

### Deploy to Web01 and Web02

**1. Copy project to servers:**
```bash
scp -r ./smart-nutrition-tracker user@WEB01_IP:/var/www/
scp -r ./smart-nutrition-tracker user@WEB02_IP:/var/www/
```

**2. On each web server (Web01 & Web02):**
```bash
sudo apt update && sudo apt install nodejs npm nginx -y

# Install backend dependencies
cd /var/www/smart-nutrition-tracker/backend
npm install

# Create .env on each server
nano .env
# Add: CLAUDE_API_KEY=your_key_here

# Install PM2 for process management
sudo npm install -g pm2
pm2 start server.js --name nutri-backend
pm2 save && pm2 startup
```

**3. Configure Nginx on each web server:**
```bash
sudo nano /etc/nginx/sites-available/nutritrack
```

Paste:
```nginx
server {
    listen 80;
    server_name _;

    root /var/www/smart-nutrition-tracker/frontend;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /insight {
        proxy_pass http://localhost:3000/insight;
        proxy_set_header Content-Type application/json;
    }

    location /chat {
        proxy_pass http://localhost:3000/chat;
        proxy_set_header Content-Type application/json;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nutritrack /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### Configure Load Balancer (Lb01)

```bash
sudo apt update && sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/nutritrack-lb
```

Paste:
```nginx
upstream nutritrack_servers {
    server WEB01_IP;
    server WEB02_IP;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass         http://nutritrack_servers;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nutritrack-lb /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

**Test:** Visit `http://LB01_IP/` — you should see the app. Refresh multiple times to confirm load balancing.

---

## 🗄️ Database Schema

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| food_name | text | Meal description |
| calories | integer | Total calories |
| protein | integer | Grams of protein |
| carbs | integer | Grams of carbohydrates |
| fats | integer | Grams of fat |
| fiber | integer | Grams of fiber |
| sugar | integer | Grams of sugar |
| date | date | Date of the meal |
| created_at | timestamptz | Timestamp |

---

## 📁 Project Structure

```
smart-nutrition-tracker/
├── frontend/
│   ├── index.html          # Login / Signup
│   ├── dashboard.html      # Main dashboard
│   ├── add-meal.html       # Analyze & log meals
│   ├── history.html        # Meal history with search/filter
│   ├── ai-chat.html        # AI Coach chat interface
│   ├── css/
│   │   └── styles.css      # Full app styles
│   └── js/
│       ├── config.js       # Supabase + API configuration
│       ├── auth.js         # Login, signup, logout
│       ├── meals.js        # Nutrition API + meal CRUD
│       └── insights.js     # AI insight + chat logic
├── backend/
│   ├── server.js           # Node.js server (Claude API)
│   ├── package.json
│   └── .env                # API keys (not in repo)
├── .gitignore
└── README.md
```

---

## 🔌 APIs Used

| API | Purpose | Documentation |
|-----|---------|---------------|
| [Edamam Nutrition Analysis API](https://developer.edamam.com/edamam-docs-nutrition-api) | Analyze meals and return calorie + macro data | [Docs](https://developer.edamam.com/edamam-docs-nutrition-api) |
| [Anthropic Claude API](https://docs.anthropic.com) | AI-generated dietary insights and chat | [Docs](https://docs.anthropic.com/en/api) |
| [Supabase](https://supabase.com/docs) | Authentication and database | [Docs](https://supabase.com/docs) |

---

# Security

- API keys are stored in `.env` (never committed to GitHub)
- Supabase Row Level Security (RLS) ensures users only see their own data
- The Claude API key is only used server-side in `backend/server.js`
- All inputs are sanitized before display to prevent XSS

---

#  Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Edamam API requires specific ingredient formatting | Added user tips on the Add Meal page with quantity guidance |
| CORS issues between frontend and backend | Added CORS headers to all backend responses |
| API keys should not be in frontend | Claude API key is backend-only; Edamam keys are public-safe with rate limiting |
| Load balancer session consistency | Supabase handles auth state client-side via JWT, so no server-side sessions needed |

---

# Credits

- Nutrition data**: [Edamam](https://www.edamam.com/) — Nutrition Analysis API
- AI insights**: [Anthropic](https://www.anthropic.com/) — Claude API
- Auth & Database**: [Supabase](https://supabase.com/)
- Fonts**: [Google Fonts](https://fonts.google.com/) — Syne & DM Sans

---
