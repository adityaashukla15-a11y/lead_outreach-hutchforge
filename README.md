# Hutchforge Lead Outreach & Automation Platform

A complete web platform deployed on **Render** (connected to your GitHub repository) to automatically scrape US builders/contractors without websites, customize cold outreach pitches, and deliver personalized emails directly via **Titan Email (GoDaddy)**.

---

## 🌟 Key Features

1. **Visual Web Dashboard**:
   - Access from anywhere in your browser (desktop or mobile).
   - Real-time stats on discovered leads, emails delivered, and failure rates.
2. **Apify Google Maps Scraper**:
   - Filter to target **only businesses without websites** (or social-only links).
   - Automatically crawls and enriches leads with contact emails & phone numbers.
3. **Dynamic Email Template Editor**:
   - Change your pitch and subject line anytime with one click.
   - Interactive variable tags: `{business_name}`, `{city}`, `{phone}`, `{email}`.
   - Live visual preview simulating client view.
4. **Titan Email (GoDaddy) Integration**:
   - Direct connection to `smtp.titan.email` (Port 465 SSL).
   - One-click **"Send Test Verification Email"** (e.g. to `contact@vyvhr.com`).
   - Anti-spam pacing (30–60 second randomized delays between emails).
5. **Hands-Off Automated Scheduler**:
   - Configurable automated timeline (e.g. runs every weekday morning).
   - Automatically scrapes, filters, composes emails, and delivers them without touching your computer.
6. **Leads Table & CSV Export**:
   - Search, filter, select, or delete leads.
   - Export lead lists to Excel / CSV with one click.

---

## 🚀 How to Deploy on Render (Takes 2 Minutes)

1. **Sign in to Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com) and log in with your GitHub account.

2. **Create New Web Service**:
   - Click **"New +"** (top right) $\rightarrow$ **"Web Service"**.
   - Select your repository: **`adityaashukla15-a11y/lead_outreach-hutchforge`**.

3. **Configure Settings**:
   - **Name**: `hutchforge-outreach` (or any name you prefer)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`

4. **Click "Deploy Web Service"**:
   - Render will build and deploy your app in about 1 minute.
   - You will get a permanent live URL (e.g., `https://hutchforge-outreach.onrender.com`).

5. **Open Your Dashboard**:
   - Open your Render URL.
   - Go to **Settings** tab $\rightarrow$ paste your Apify token and Titan password.
   - Click **"Send Test"** to verify delivery to `contact@vyvhr.com`.
   - Turn on the **Automated Schedule** to let it run hands-free!
