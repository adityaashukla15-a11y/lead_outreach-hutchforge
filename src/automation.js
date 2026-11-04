import cron from 'node-cron';
import { readDb, writeDb, addLog } from './db.js';
import { scrapeLeads } from './scraper.js';
import { createTitanTransporter, sendOutreachEmail } from './mailer.js';

let activeCronTask = null;
let isCycleRunning = false;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes a full cycle: Scrape -> Deduplicate -> Send Batch -> Log
 */
export async function runOutreachCycle({ manual = false, scrapeOnly = false, sendOnly = false } = {}) {
  if (isCycleRunning) {
    addLog("A cycle is already in progress. Skipping trigger.", "WARNING");
    return { success: false, message: "A cycle is already in progress." };
  }

  isCycleRunning = true;
  const db = readDb();
  const { settings, template } = db;

  try {
    addLog(`Starting outreach cycle (${manual ? 'Manual' : 'Automated Schedule'})...`, "INFO");

    // 1. Scraping Step
    if (!sendOnly && settings.apifyToken) {
      try {
        addLog(`Scraping "${settings.niche}" in "${settings.location}"...`, "INFO");
        const scraped = await scrapeLeads({
          apifyToken: settings.apifyToken,
          niche: settings.niche,
          location: settings.location,
          maxResults: settings.batchSize || 20,
          onlyWithoutWebsites: settings.onlyWithoutWebsites
        });

        // Deduplicate against existing leads
        const existingEmails = new Set(db.leads.map(l => l.email.toLowerCase()));
        let newCount = 0;
        for (const lead of scraped) {
          if (!existingEmails.has(lead.email.toLowerCase())) {
            db.leads.unshift(lead);
            existingEmails.add(lead.email.toLowerCase());
            newCount++;
          }
        }
        writeDb(db);
        addLog(`Discovered ${scraped.length} leads (${newCount} new added to list).`, "SUCCESS");
      } catch (err) {
        addLog(`Scraping step failed: ${err.message}`, "ERROR");
      }
    }

    if (scrapeOnly) {
      isCycleRunning = false;
      return { success: true, message: "Scraping completed." };
    }

    // 2. Email Sending Step
    if (!settings.titanEmail || !settings.titanPassword) {
      addLog("Email sending skipped: Titan Email or Password not configured.", "WARNING");
      isCycleRunning = false;
      return { success: true, message: "Leads scraped, but email sending skipped (Titan credentials missing)." };
    }

    const pendingLeads = db.leads.filter(l => l.status === 'NEW').slice(0, settings.batchSize || 20);

    if (pendingLeads.length === 0) {
      addLog("No new leads pending in queue to email.", "INFO");
      isCycleRunning = false;
      return { success: true, message: "No pending leads to send." };
    }

    addLog(`Preparing to email ${pendingLeads.length} leads with ${settings.delaySeconds || 40}s delay...`, "INFO");
    const host = settings.smtpHost || 'smtp.titan.email';
    const port = parseInt(settings.smtpPort || '587', 10);
    const transporter = createTitanTransporter(settings.titanEmail, settings.titanPassword, port, host);

    let sentCount = 0;
    for (let i = 0; i < pendingLeads.length; i++) {
      const lead = pendingLeads[i];
      addLog(`[${i + 1}/${pendingLeads.length}] Sending to ${lead.name} (${lead.email})...`, "INFO");

      const res = await sendOutreachEmail({
        transporter,
        fromEmail: settings.titanEmail,
        senderName: settings.senderName,
        lead,
        templateSubject: template.subject,
        templateBody: template.body,
        dryRun: false
      });

      if (res.success) {
        lead.status = 'SENT';
        lead.sentAt = new Date().toISOString();
        sentCount++;
        addLog(`Sent to ${lead.email}`, "SUCCESS");
      } else {
        lead.status = 'FAILED';
        lead.error = res.error;
        addLog(`Failed sending to ${lead.email}: ${res.error}`, "ERROR");
      }

      writeDb(db);

      // Delay between sends
      if (i < pendingLeads.length - 1) {
        const delay = (settings.delaySeconds || 40) * 1000;
        await sleep(delay);
      }
    }

    addLog(`Outreach cycle finished. ${sentCount} emails sent successfully.`, "SUCCESS");
    isCycleRunning = false;
    return { success: true, sentCount };
  } catch (err) {
    addLog(`Fatal error in outreach cycle: ${err.message}`, "ERROR");
    isCycleRunning = false;
    return { success: false, error: err.message };
  }
}

/**
 * Initializes or reloads the automated cron schedule based on user settings
 */
export function initScheduler() {
  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
  }

  const { settings } = readDb();
  if (!settings.autoRunEnabled) {
    console.log("[Scheduler] Automated scheduler is currently DISABLED.");
    return;
  }

  // Parse scheduleTime (e.g., "09:00")
  const [hour, minute] = (settings.scheduleTime || "09:00").split(':').map(Number);
  const dayPattern = settings.scheduleDays === 'weekdays' ? '1-5' : '*';
  const cronExp = `${minute || 0} ${hour || 9} * * ${dayPattern}`;

  console.log(`[Scheduler] Setting up cron job: "${cronExp}" (${settings.scheduleDays})`);

  activeCronTask = cron.schedule(cronExp, () => {
    console.log("[Scheduler] Triggering scheduled outreach cycle...");
    runOutreachCycle({ manual: false });
  });

  addLog(`Automated scheduler active: Runs daily at ${settings.scheduleTime} (${settings.scheduleDays}).`, "INFO");
}

export function getSchedulerStatus() {
  const { settings } = readDb();
  return {
    enabled: !!settings.autoRunEnabled,
    time: settings.scheduleTime || "09:00",
    days: settings.scheduleDays || "weekdays",
    isRunning: isCycleRunning
  };
}
