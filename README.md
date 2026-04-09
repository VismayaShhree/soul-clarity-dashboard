# Soul Clarity Dashboard

Personal analytics dashboard that reads your Soul Clarity Tracker from Google Sheets and visualizes energy, sadhana, moon cycles, digestion, and mood patterns.

**100% free. No API keys needed.**

## Deploy to Vercel (5 minutes)

### Step 1: Create GitHub Repo
1. Go to **github.com** → Click **+** → **New repository**
2. Name it `soul-clarity-dashboard`
3. Set it to **Public**
4. Click **Create repository**
5. On the next page, click **"uploading an existing file"**
6. Unzip the downloaded folder and drag ALL files into GitHub
7. Click **Commit changes**

### Step 2: Deploy on Vercel
1. Go to **vercel.com**
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. Click **Add New → Project**
5. Find `soul-clarity-dashboard` and click **Import**
6. In Environment Variables, add:
   - Name: `NEXT_PUBLIC_SHEET_ID`
   - Value: `1PTd2y1xxw1QxlAMczoP1OJ-9HBZ-k-D_WL-AmLuHJYc`
7. Click **Deploy**
8. Wait 1-2 minutes — done!

### Step 3: Use as Mobile App
1. Open your Vercel URL on your phone
2. **iPhone**: Tap Share → Add to Home Screen
3. **Android**: Tap ⋮ → Add to Home Screen

## Features
- **Dashboard**: Energy bars, sadhana frequency, digestion heatmap, moon distribution
- **Insights**: Kriya impact on energy, energy by moon phase, mood patterns, digestion breakdown, drink frequency, streaks
- **Data**: Browse entries, export CSV, view connected sheets
- **Live Sync**: Pulls latest data from your Google Sheet
- **Filter**: By week, month, 3 months, year, or specific moon phase
