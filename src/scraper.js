import { ApifyClient } from 'apify-client';

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) return false;

  const badPatterns = [
    'wixpress', 'sentry', 'example.com', 'domain.com',
    'noreply', 'no-reply', 'mailer-daemon', 'donotreply', 'support@google.com'
  ];
  return !badPatterns.some(bad => cleaned.includes(bad));
}

function extractEmails(item) {
  const found = new Set();
  
  if (item.email && isValidEmail(item.email)) {
    found.add(item.email.trim().toLowerCase());
  }
  if (Array.isArray(item.emails)) {
    item.emails.forEach(e => {
      if (isValidEmail(e)) found.add(e.trim().toLowerCase());
    });
  }
  if (Array.isArray(item.contactDetails?.emails)) {
    item.contactDetails.emails.forEach(e => {
      if (isValidEmail(e)) found.add(e.trim().toLowerCase());
    });
  }

  const textBlob = `${item.description || ''} ${item.additionalInfo || ''} ${item.address || ''}`;
  const regexMatches = textBlob.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (regexMatches) {
    regexMatches.forEach(e => {
      if (isValidEmail(e)) found.add(e.trim().toLowerCase());
    });
  }

  return Array.from(found);
}

export async function scrapeLeads({
  apifyToken,
  niche = "Builders & Construction Contractors",
  location = "Dallas, TX",
  maxResults = 20,
  onlyWithoutWebsites = true
}) {
  if (!apifyToken) {
    throw new Error("Apify API Token is required to scrape live Google Maps data. Please set your token in Settings.");
  }

  const client = new ApifyClient({ token: apifyToken.trim() });
  const searchQuery = `${niche} in ${location}`;

  const runInput = {
    searchStringsArray: [searchQuery],
    maxCrawledPlacesPerSearch: Math.min(maxResults * 4, 120),
    language: 'en',
    scrapeContactDetails: true,
    scrapeReviewerName: false,
    scrapeReviews: false
  };

  const run = await client.actor('compass/crawler-google-places').call(runInput);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const leads = [];

  for (const item of items) {
    const rawWebsite = (item.website || '').toLowerCase().trim();
    const hasNoOfficialWebsite = !rawWebsite || 
      rawWebsite.includes('facebook.com') || 
      rawWebsite.includes('instagram.com') ||
      rawWebsite.includes('google.com') ||
      rawWebsite.includes('business.site') ||
      rawWebsite.includes('yelp.com');

    if (onlyWithoutWebsites && !hasNoOfficialWebsite) {
      continue;
    }

    const emails = extractEmails(item);
    if (emails.length > 0) {
      leads.push({
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: item.title || item.name || 'Local Builder',
        city: item.city || location.split(',')[0].trim(),
        email: emails[0],
        phone: item.phone || item.phoneUnformatted || 'N/A',
        website: item.website || 'None',
        status: 'NEW',
        discoveredAt: new Date().toISOString()
      });
    }

    if (leads.length >= maxResults) break;
  }

  return leads;
}
