import 'dotenv/config';
import { getContactedEmails, recordLead } from './storage.js';
import { scrapeLeadsWithApify, getMockOrFallbackLeads } from './scraper.js';
import { createTitanTransporter, sendOutreachEmail } from './mailer.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log(`====================================================`);
  console.log(`   HUTCHFORGE AUTOMATED LEAD OUTREACH PIPELINE     `);
  console.log(`====================================================`);

  const titanEmail = process.env.TITAN_EMAIL || 'hello@hutchforge.in';
  const titanPass = process.env.TITAN_PASSWORD;
  const apifyToken = process.env.APIFY_TOKEN;
  const location = process.env.LOCATION || 'Dallas, TX';
  const batchSize = parseInt(process.env.BATCH_SIZE || '20', 10);
  const dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

  console.log(`[Config] Sender: ${titanEmail}`);
  console.log(`[Config] Target Location: ${location}`);
  console.log(`[Config] Batch Size: ${batchSize}`);
  console.log(`[Config] Dry Run Mode: ${dryRun ? 'ENABLED (No emails will actually be sent)' : 'DISABLED (Live sending)'}`);

  // 1. Check deduplication database
  const previouslyContacted = getContactedEmails();
  console.log(`[Storage] Loaded ${previouslyContacted.size} previously contacted emails.`);

  // 2. Discover leads
  let leads = [];
  if (apifyToken) {
    leads = await scrapeLeadsWithApify(apifyToken, 'builders construction contractors', location, batchSize);
  } else {
    console.log(`[Notice] APIFY_TOKEN not detected. Using sample builder leads for demonstration.`);
    leads = await getMockOrFallbackLeads(location, 5);
  }

  // 3. Deduplicate
  const freshLeads = leads.filter(l => !previouslyContacted.has(l.email.toLowerCase()));
  console.log(`[Pipeline] Discovered ${leads.length} leads, ${freshLeads.length} are new/uncontacted.`);

  if (freshLeads.length === 0) {
    console.log(`[Pipeline] No new leads to contact in this run. Exiting.`);
    return;
  }

  // 4. Initialize SMTP transporter
  let transporter = null;
  if (!dryRun) {
    if (!titanPass) {
      console.error(`[Error] TITAN_PASSWORD environment variable is missing! Cannot send live emails.`);
      process.exit(1);
    }
    transporter = createTitanTransporter(titanEmail, titanPass);
  }

  // 5. Send emails with human-like delay
  let sentCount = 0;
  for (let i = 0; i < freshLeads.length; i++) {
    const lead = freshLeads[i];
    console.log(`\n[${i + 1}/${freshLeads.length}] Processing: ${lead.name} (${lead.email})`);

    const result = await sendOutreachEmail(transporter, titanEmail, lead, dryRun);

    if (result.success) {
      sentCount++;
      recordLead(lead, dryRun ? 'DRY_RUN' : 'SENT');
    } else {
      recordLead(lead, `FAILED: ${result.error}`);
    }

    // Safety delay between emails (30 to 45 seconds in live mode to protect domain reputation)
    if (!dryRun && i < freshLeads.length - 1) {
      const delaySec = Math.floor(Math.random() * 15) + 30; // 30-45 sec
      console.log(`[Delay] Pausing for ${delaySec}s before sending next email to protect mailbox reputation...`);
      await sleep(delaySec * 1000);
    }
  }

  console.log(`\n====================================================`);
  console.log(`Completed run: ${sentCount} leads processed successfully.`);
  console.log(`Leads record saved in leads_history.csv`);
  console.log(`====================================================\n`);
}

main().catch(err => {
  console.error(`[Fatal Error]`, err);
  process.exit(1);
});
