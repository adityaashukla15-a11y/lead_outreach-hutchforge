# Hutchforge Lead Outreach Automation

Automated pipeline to discover US builders and construction companies without websites and send personalized cold outreach directly from `hello@hutchforge.in` via Titan Email (GoDaddy).

Runs 100% in the cloud on **GitHub Actions** with zero computer uptime required.

---

## 🔒 Step 1: Add Your Encrypted Secrets

To allow GitHub Actions to safely access your Titan Email and Apify scraper without exposing passwords in code:

1. Go to your repository on GitHub: `https://github.com/adityaashukla15-a11y/lead_outreach-hutchforge`
2. Click **Settings** (top tab) $\rightarrow$ In the left sidebar, click **Secrets and variables** $\rightarrow$ **Actions**.
3. Under **Repository secrets**, click **"New repository secret"** and add these two secrets:

| Secret Name | Value |
| :--- | :--- |
| `TITAN_PASSWORD` | Your password for `hello@hutchforge.in` |
| `APIFY_TOKEN` | Your Apify API token (`apify_api_...`) |

*(Optional: If you ever want to change the sender address, you can also add `TITAN_EMAIL`, but it defaults to `hello@hutchforge.in`).*

---

## 🚀 Step 2: Running the Automation

### Option A: Manual Trigger (On-Demand from Browser)
1. Go to the **Actions** tab in your repository.
2. Click **"Hutchforge Lead Outreach Pipeline"** on the left.
3. Click the **"Run workflow"** button on the right.
4. Set:
   * **Dry Run**: Check this box if you want a test run (prints drafted emails to logs without sending). Uncheck to send real emails.
   * **Target Location**: (e.g., `Dallas, TX`, `Miami, FL`, `Atlanta, GA`)
   * **Batch size**: Recommended `20` to `25` per batch.
5. Click **"Run workflow"**.

### Option B: Automatic Daily Schedule
The workflow runs automatically **Monday through Friday at 14:00 UTC (9:00 AM US Central / 7:30 PM IST)** so you don't even have to click anything!

---

## 📊 Deduplication & Contact History
All contacted businesses are logged in `leads_history.csv` with their business name, city, email, and timestamp. The automation checks this file first before sending any message to guarantee **no company is ever contacted twice**.
