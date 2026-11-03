import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.resolve('leads_history.csv');
const CSV_HEADER = 'BusinessName,City,Email,Phone,DateContacted,Status\n';

/**
 * Loads previously contacted emails into a Set for instant deduplication.
 */
export function getContactedEmails() {
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, CSV_HEADER, 'utf-8');
    return new Set();
  }

  const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  const contacted = new Set();

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 3) {
      const email = parts[2].trim().toLowerCase();
      if (email) contacted.add(email);
    }
  }

  return contacted;
}

/**
 * Records a successful or skipped lead into leads_history.csv
 */
export function recordLead(lead, status = 'SENT') {
  const sanitize = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
  const row = [
    sanitize(lead.name),
    sanitize(lead.city),
    sanitize(lead.email),
    sanitize(lead.phone),
    new Date().toISOString(),
    status
  ].join(',') + '\n';

  fs.appendFileSync(HISTORY_FILE, row, 'utf-8');
}
