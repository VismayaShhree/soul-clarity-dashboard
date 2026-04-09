# 🪷 Soul Clarity Dashboard

A personal analytics dashboard that reads your Soul Clarity Tracker from Google Sheets, visualizes energy/sadhana/moon/digestion patterns, and uses AI to decode your routine.

## 🚀 Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub
1. Create a new GitHub repo (e.g., `soul-clarity-dashboard`)
2. Upload all these files to it (drag and drop works!)
   - Or use git:
   ```bash
   git init
   git add .
   git commit -m "Soul Clarity Dashboard v1"
   git remote add origin https://github.com/YOUR_USERNAME/soul-clarity-dashboard.git
   git push -u origin main
   ```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `soul-clarity-dashboard` repo
4. In **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
   - `NEXT_PUBLIC_SHEET_ID` = `1PTd2y1xxw1QxlAMczoP1OJ-9HBZ-k-D_WL-AmLuHJYc`
5. Click **Deploy** — done! 🎉

### Step 3: Use it
- Your app will be live at `https://soul-clarity-dashboard.vercel.app`
- It reads directly from your Google Sheet (must be "Anyone with link can view")
- Hit ↻ Sync anytime to pull latest data
- Use 🧬 Decode to get AI analysis by day/week/month/year/moon phase
- Export data as CSV from the 📋 Data tab

## 📱 Use as Mobile App
On your phone:
1. Open the Vercel URL in Safari (iOS) or Chrome (Android)
2. Tap **Share → Add to Home Screen**
3. It now works like a native app!

## 🔒 Security
- Your Anthropic API key stays server-side (in `/api/decode`)
- Google Sheet is read-only via public CSV export
- No data is stored on the server — everything comes from your sheet

## 📊 Features
- **Dashboard**: Energy bars, sadhana frequency, digestion heatmap, moon distribution
- **AI Decode**: Analyze by day, week, month, year, or specific moon phase
- **Data View**: Browse entries, export CSV, see connected sheets
- **Live Sync**: Pull latest data from Google Sheets anytime
- **Yoga-aware AI**: Knows Isha Yoga sequencing (Shakthi Chalana → Shoonya, etc.)

## 🔧 Customize
- Change `NEXT_PUBLIC_SHEET_ID` to point to a different spreadsheet
- The app auto-detects column headers, so slight format differences work
- Tab names are configured in `page.js` — update if you rename them
