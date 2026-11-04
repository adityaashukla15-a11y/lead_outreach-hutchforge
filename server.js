import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDb, writeDb, addLog } from './src/db.js';
import { verifySmtpConnection, createTitanTransporter, sendOutreachEmail } from './src/mailer.js';
import { runOutreachCycle, initScheduler, getSchedulerStatus } from './src/automation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. System Status & Stats
app.get('/api/status', (req, res) => {
  const db = readDb();
  const leads = db.leads || [];
  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'NEW').length,
    sentLeads: leads.filter(l => l.status === 'SENT').length,
    failedLeads: leads.filter(l => l.status === 'FAILED').length,
    scheduler: getSchedulerStatus()
  };
  res.json(stats);
});

// 2. Settings Endpoints
app.get('/api/settings', (req, res) => {
  const db = readDb();
  const safeSettings = { ...db.settings };
  // Mask password for display
  safeSettings.hasPassword = !!safeSettings.titanPassword;
  safeSettings.titanPassword = safeSettings.titanPassword ? "••••••••" : "";
  res.json(safeSettings);
});

app.post('/api/settings', (req, res) => {
  const db = readDb();
  const incoming = req.body;

  // Preserve existing password if user didn't change masked string
  if (incoming.titanPassword === "••••••••" || !incoming.titanPassword) {
    incoming.titanPassword = db.settings.titanPassword;
  }

  db.settings = { ...db.settings, ...incoming };
  writeDb(db);
  initScheduler(); // reload scheduler with new timings
  addLog("Settings updated successfully.", "INFO");
  res.json({ success: true, settings: db.settings });
});

// 3. Email Template Endpoints
app.get('/api/template', (req, res) => {
  const db = readDb();
  res.json(db.template);
});

app.post('/api/template', (req, res) => {
  const db = readDb();
  db.template = {
    subject: req.body.subject || db.template.subject,
    body: req.body.body || db.template.body
  };
  writeDb(db);
  addLog("Outreach email template updated.", "INFO");
  res.json({ success: true, template: db.template });
});

// 4. Leads Endpoints
app.get('/api/leads', (req, res) => {
  const db = readDb();
  res.json(db.leads || []);
});

app.post('/api/leads/delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });

  const db = readDb();
  const idSet = new Set(ids);
  db.leads = db.leads.filter(l => !idSet.has(l.id));
  writeDb(db);
  res.json({ success: true, remaining: db.leads.length });
});

app.post('/api/leads/clear', (req, res) => {
  const db = readDb();
  db.leads = [];
  writeDb(db);
  addLog("All leads cleared from queue.", "WARNING");
  res.json({ success: true });
});

// 5. Test Email Verification
app.post('/api/test-email', async (req, res) => {
  const db = readDb();
  const targetEmail = (req.body.recipient || db.settings.testEmail || "contact@vyvhr.com").trim();

  if (!db.settings.titanEmail || !db.settings.titanPassword) {
    return res.status(400).json({ success: false, error: "Please enter your Titan Email and Password in Settings first." });
  }

  addLog(`Sending test verification email to ${targetEmail}...`, "INFO");

  const testLead = {
    name: "Sample Construction & Builders",
    city: db.settings.location.split(',')[0].trim() || "Dallas",
    email: targetEmail,
    phone: "+1 (555) 019-2834"
  };

  try {
    const transporter = createTitanTransporter(db.settings.titanEmail, db.settings.titanPassword);
    const result = await sendOutreachEmail({
      transporter,
      fromEmail: db.settings.titanEmail,
      senderName: db.settings.senderName,
      lead: testLead,
      templateSubject: db.template.subject,
      templateBody: db.template.body,
      dryRun: false
    });

    if (result.success) {
      addLog(`Test email delivered to ${targetEmail}!`, "SUCCESS");
      res.json({ success: true, message: `Test email sent to ${targetEmail}. Check your inbox!` });
    } else {
      addLog(`Test email failed: ${result.error}`, "ERROR");
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Manual Trigger Actions
app.post('/api/actions/run-scrape', async (req, res) => {
  res.json({ success: true, message: "Scraping started in background." });
  runOutreachCycle({ manual: true, scrapeOnly: true });
});

app.post('/api/actions/run-send', async (req, res) => {
  res.json({ success: true, message: "Email dispatch started in background." });
  runOutreachCycle({ manual: true, sendOnly: true });
});

app.post('/api/actions/run-full', async (req, res) => {
  res.json({ success: true, message: "Full cycle (Scrape & Send) started in background." });
  runOutreachCycle({ manual: true });
});

// 7. Activity Logs
app.get('/api/logs', (req, res) => {
  const db = readDb();
  res.json(db.logs || []);
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  HUTCHFORGE OUTREACH PLATFORM RUNNING ON PORT ${PORT}  `);
  console.log(`  Local URL: http://localhost:${PORT}               `);
  console.log(`====================================================`);
  initScheduler();
});
