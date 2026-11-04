import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve('data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const DEFAULT_TEMPLATE = {
  subject: "Web presence & project inquiries for {business_name}",
  body: `Hello,

We are Hutchforge, a digital creative agency (https://hutchforge.in/).

We noticed {business_name} is doing great work in {city}, but couldn't find an official website listed for your business. Most homeowners and commercial clients search online first before choosing a contractor or builder.

We specialize in helping construction companies and builders establish a modern, high-converting web presence to showcase past projects and attract more direct inquiries.

You can learn more about our agency and explore our work here:
Website: https://hutchforge.in/

We would love to share a quick mock-up or idea of how a modern site for {business_name} could look. Would you be open to a brief chat this week?

Looking forward to hearing from you.

Best regards,
Team Hutchforge
Digital Creative Agency
https://hutchforge.in/

---
If you'd prefer not to hear from us, just reply with "unsubscribe" and we won't reach out again.`
};

const DEFAULT_SETTINGS = {
  apifyToken: process.env.APIFY_TOKEN || "",
  titanEmail: process.env.TITAN_EMAIL || "hello@hutchforge.in",
  titanPassword: process.env.TITAN_PASSWORD || "",
  senderName: "Team Hutchforge",
  niche: "Builders & Construction Contractors",
  location: "Dallas, TX",
  batchSize: 20,
  delaySeconds: 45,
  onlyWithoutWebsites: true,
  autoRunEnabled: false,
  scheduleTime: "09:00", // 9 AM daily
  scheduleDays: "weekdays", // weekdays or everyday
  testEmail: "contact@vyvhr.com"
};

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      settings: DEFAULT_SETTINGS,
      template: DEFAULT_TEMPLATE,
      leads: [],
      logs: [
        {
          timestamp: new Date().toISOString(),
          type: "INFO",
          message: "Platform initialized successfully."
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function readDb() {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database:", err);
    return { settings: DEFAULT_SETTINGS, template: DEFAULT_TEMPLATE, leads: [], logs: [] };
  }
}

export function writeDb(data) {
  ensureDbExists();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function addLog(message, type = "INFO") {
  const db = readDb();
  if (!db.logs) db.logs = [];
  db.logs.unshift({
    timestamp: new Date().toISOString(),
    type,
    message
  });
  // Keep last 200 logs
  if (db.logs.length > 200) db.logs = db.logs.slice(0, 200);
  writeDb(db);
}
