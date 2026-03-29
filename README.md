NutriTrack 🥗
I built this as my ALX Web Stack assignment. The idea came from a simple frustration — every nutrition app I tried was built for people in the US or Europe. They didn't know what ugali was. They had no idea about isombe or ikivuguto. So I decided to build one that does.
NutriTrack is a full-stack web app that lets you log meals, get real nutrition data back, and have an AI coach analyze your eating habits. It's not just a calorie counter — it actually tells you something useful about what you're eating and what to change.

What I was trying to solve
Most people in Kigali don't track what they eat — not because they don't care, but because the tools available don't reflect what they actually eat. I wanted something that:

Works with local foods (ugali, beans, sweet potatoes, plantains)
Gives real feedback, not just numbers
Is simple enough that anyone can use it
Actually runs — deployed on real servers, not just localhost


What the app does
Meal logging — You type what you ate in plain English. "A plate of rice and beans" or "2 boiled eggs and tea." The Edamam Nutrition API reads that and returns the calories, protein, carbs, fat, fiber, and sugar. You save it and it goes into your history.
Dashboard — Shows your daily intake with a calorie ring that fills up as you eat. Also shows your protein, carbs, and fat as progress bars against daily targets. You can see your last 5 meals at a glance.
Meal history — A full table of every meal you've logged. You can search by food name or filter by a specific date. Totals update automatically based on what's filtered.
AI daily insight — One button that sends today's meals to the Claude AI and gets back a short, honest analysis. What you did well, what to fix, and one actionable tip for tomorrow.
AI chat coach — A chat interface where you can ask anything. "Is ugali healthy?" "How do I hit my protein goals on a budget?" "What should I eat after a workout?" It knows Rwandan food and gives practical answers.
User accounts — Sign up with email and password. Supabase handles authentication and makes sure your meal data is private to you.

Tech stack
PartTechnologyWhy I chose itFrontendHTML, CSS, Vanilla JavaScriptNo frameworks — the assignment asked for it and it keeps things simpleDatabase + AuthSupabaseGives you a PostgreSQL database and authentication in one place, free tier is generousNutrition dataEdamam Nutrition Analysis APIFree, accurate, understands natural language ingredient descriptionsAIAnthropic Claude APIBetter at nuanced dietary advice than most alternatives, especially for local food contextsBackendNode.js (no frameworks)Just the built-in http module — lightweight and straightforwardWeb serverNginxServes the frontend and proxies API requests to the Node backendLoad balancerHAProxyAlready configured on lb-01, handles round robin between web-01 and web-02Process managerPM2Keeps the Node backend running and restarts it automatically if it crashes

Live deployment
ServerAddressLoad balancer (main URL)https://18.207.186.124Web-01 (direct)http://3.95.187.87Web-02 (direct)http://44.211.134.110
Traffic hits the load balancer first. HAProxy distributes requests between web-01 and web-02 using round robin — each request goes to the next server in turn. Both servers run identical code and both have their own Node.js backend running via PM2.

Project structure
smart-nutrition-tracker/
├── Frontend/
│   ├── index.html          # login and signup page
│   ├── dashboard.html      # main dashboard with calorie ring
│   ├── add-meal.html       # meal input and nutrition analysis
│   ├── history.html        # full meal log with search and date filter
│   ├── ai-chat.html        # AI coach chat interface
│   ├── css/
│   │   └── styles.css      # all styles for the entire app
│   └── js/
│       ├── config.js       # Supabase client setup and API keys
│       ├── auth.js         # login, signup, logout, toast notifications
│       ├── meals.js        # Edamam API calls + Supabase meal CRUD
│       └── insights.js     # AI insight button + chat logic
├── backend/
│   ├── server.js           # Node.js HTTP server, calls Claude API
│   ├── package.json
│   └── .env                # API keys — not in the repo
├── .gitignore
└── README.md

Running it locally
What you need

Node.js v18 or higher — run node -v to check
A Supabase project
An Edamam Nutrition Analysis API key — free at developer.edamam.com
A Claude API key — from console.anthropic.com

Step 1 — Clone the repo
bashgit clone https://github.com/MAcDen34/Smart-nutrition-tracker.git
cd Smart-nutrition-tracker
Step 2 — Create the Supabase meals table
Go to your Supabase project → SQL Editor → run this:
sqlcreate table meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  food_name text not null,
  calories integer default 0,
  protein integer default 0,
  carbs integer default 0,
  fats integer default 0,
  fiber integer default 0,
  sugar integer default 0,
  date date default current_date,
  created_at timestamptz default now()
);

alter table meals enable row level security;

create policy "Users can manage own meals"
  on meals for all
  using (auth.uid() = user_id);
Step 3 — Add your keys to the frontend
Open Frontend/js/config.js and fill in your values:
jsconst SUPABASE_URL      = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";
const EDAMAM_APP_ID     = "your-app-id";
const EDAMAM_APP_KEY    = "your-app-key";
Step 4 — Set up and start the backend
bashcd backend
npm install
Create a .env file inside the backend/ folder:
CLAUDE_API_KEY=your-claude-api-key
PORT=3000
Start it:
bashnpm start
You should see:
✅ NutriTrack backend running on port 3000
Step 5 — Open the app
Open Frontend/index.html in your browser. If you're using VS Code, right-click the file and choose Open with Live Server.

How I deployed it
Overview
The app runs on two Ubuntu servers (web-01 and web-02) sitting behind a HAProxy load balancer (lb-01). Both web servers run Nginx to serve the frontend and proxy backend API requests to a Node.js process managed by PM2.
What I did on each web server (web-01 and web-02)
bash# Install dependencies
sudo apt update && sudo apt install -y nginx git nodejs npm

# Clone the repo
cd /var/www
sudo git clone https://github.com/MAcDen34/Smart-nutrition-tracker.git
sudo mv Smart-nutrition-tracker smart-nutrition-tracker

# Fix folder casing (Linux is case-sensitive)
sudo mv smart-nutrition-tracker/Frontend smart-nutrition-tracker/frontend

# Fix permissions
sudo chown -R ubuntu:ubuntu /var/www/smart-nutrition-tracker

# Install backend dependencies
cd /var/www/smart-nutrition-tracker/backend
npm install

# Create environment file
nano .env
# Add: CLAUDE_API_KEY=your-key and PORT=3000

# Start backend with PM2
sudo npm install -g pm2
pm2 start /var/www/smart-nutrition-tracker/backend/server.js --name nutri-backend
pm2 save
pm2 startup
# Run the command pm2 startup gives you
Nginx config at /etc/nginx/sites-available/nutritrack:
nginxserver {
    listen 80;
    server_name _;

    root /var/www/smart-nutrition-tracker/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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
bashsudo ln -s /etc/nginx/sites-available/nutritrack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
Load balancer (lb-01)
lb-01 already had HAProxy installed and configured from a previous project. I verified it was pointing to web-01 and web-02 on port 80 with round robin. The relevant section of /etc/haproxy/haproxy.cfg:
backend backend_cluster
    balance roundrobin
    server web-01 3.95.187.87:80 check
    server web-02 44.211.134.110:80 check
To confirm round robin was working I ran curl -sI localhost multiple times on lb-01 and watched the last-modified header alternate between two different timestamps — one from web-01 and one from web-02.

How the data flows
When a user logs a meal:

They type a description into the input field
The frontend calls the Edamam API directly with that text
Edamam returns calories and macros
The user clicks save — the data goes to Supabase
The dashboard reads from Supabase and updates the calorie ring

When a user asks for an AI insight:

The frontend fetches today's meals from Supabase
It sends a summary to the backend (/insight endpoint)
The backend calls the Claude API with the meal data
Claude returns a short analysis
The frontend displays it

The Claude API key never touches the frontend — it only lives in the backend .env file on the server.

APIs used
Edamam Nutrition Analysis API
Converts natural language meal descriptions into nutrition data. Free tier allows 400 calls per minute. Called directly from the frontend JavaScript.
Anthropic Claude API
Powers both the daily insight feature and the AI chat coach. Only called from the backend to keep the API key secure. Uses the claude-sonnet-4-20250514 model.
Supabase
Handles user authentication (email/password) and stores all meal data in a PostgreSQL database. Row Level Security policies make sure each user can only access their own data.

Challenges I ran into
Case-sensitive folder names on Linux — My repo had a Frontend folder with a capital F. On my laptop (macOS) this was fine, but on the Ubuntu servers Nginx couldn't find it because it was looking for frontend in lowercase. Fixed it with mv on each server.
sudo npm not found — On web-01, Node was installed but sudo couldn't find it because it uses a different PATH. The fix was to just drop sudo and run npm install as the ubuntu user after fixing folder permissions with chown.
Backend URL in production — The frontend was hardcoded to call http://localhost:3000 for AI features. That works locally but not in production because the browser makes that request, not the server. Fixed it by setting BACKEND_URL to an empty string so fetch calls go to the same origin, and Nginx handles the proxy to port 3000.
Port 80 conflict on lb-01 — HAProxy was already running on port 80 for another project. Rather than fight it, I checked the existing HAProxy config and confirmed it was already routing to web-01 and web-02 — my servers. No changes needed.

Security notes

The Claude API key is only stored in backend/.env on each server — never in the frontend code or the repo
Supabase Row Level Security ensures users can only read and write their own meal data
.env is in .gitignore so it never gets pushed to GitHub
All inputs are sanitized with escHtml() before being rendered in the DOM to prevent XSS


Credits

Nutrition data: Edamam
AI: Anthropic
Auth and database: Supabase
Fonts: Google Fonts — Syne and DM Sans
Process manager: PM2


