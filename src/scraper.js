import { ApifyClient } from 'apify-client';

/**
 * Validates whether an email is clean and personal (not a spam trap or generic unmonitored bounce)
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) return false;

  // Filter out system and platform noise
  const badPatterns = [
    'wixpress', 'sentry', 'example.com', 'domain.com',
    'noreply', 'no-reply', 'mailer-daemon', 'donotreply', 'support@google.com'
  ];
  return !badPatterns.some(bad => cleaned.includes(bad));
}

/**
 * Extracts emails from string or array fields
 */
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

  // Check additional text fields or social profiles for emails (small builders often put email in description)
  const textBlob = `${item.description || ''} ${item.additionalInfo || ''} ${item.address || ''}`;
  const regexMatches = textBlob.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (regexMatches) {
    regexMatches.forEach(e => {
      if (isValidEmail(e)) found.add(e.trim().toLowerCase());
    });
  }

  return Array.from(found);
}

/**
 * Scrapes businesses via Apify Google Maps actor
 */
export async function scrapeLeadsWithApify(apiToken, searchTerms, location, maxResults = 30) {
  const client = new ApifyClient({ token: apiToken });

  console.log(`[Scraper] Searching for "${searchTerms}" in "${location}" via Apify...`);

  // We use compass/crawler-google-places actor (one of the most popular and cost-effective)
  // or fallback to lukas/google-maps-contact-details
  const runInput = {
    searchStringsArray: [`${searchTerms} in ${location}`],
    maxCrawledPlacesPerSearch: Math.min(maxResults * 3, 100),
    language: 'en',
    scrapeContactDetails: true,
    scrapeReviewerName: false,
    scrapeReviews: false
  };

  try {
    const run = await client.actor('compass/crawler-google-places').call(runInput);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`[Scraper] Total raw places fetched: ${items.length}`);

    const filteredLeads = [];

    for (const item of items) {
      const hasNoOfficialWebsite = !item.website || 
        item.website.includes('facebook.com') || 
        item.website.includes('instagram.com') ||
        item.website.includes('google.com');

      if (!hasNoOfficialWebsite) {
        // Skip businesses that already have their own custom domain website
        continue;
      }

      const emails = extractEmails(item);
      if (emails.length > 0) {
        filteredLeads.push({
          name: item.title || item.name || 'Business Owner',
          city: item.city || location.split(',')[0].trim(),
          email: emails[0],
          phone: item.phone || item.phoneUnformatted || 'N/A',
          website: item.website || 'None'
        });
      }

      if (filteredLeads.length >= maxResults) break;
    }

    return filteredLeads;
  } catch (error) {
    console.error(`[Scraper] Apify call failed: ${error.message}`);
    return [];
  }
}

/**
 * Fallback mock generator / directory scraper when Apify token is not provided
 */
export async function getMockOrFallbackLeads(location, maxResults = 5) {
  console.log(`[Scraper] Running in fallback mode for ${location}...`);
  return [
    {
      name: 'Lone Star Custom Builders',
      city: location.split(',')[0].trim() || 'Dallas',
      email: 'contact@lonestarcustombuilders.example',
      phone: '(214) 555-0182',
      website: 'None'
    },
    {
      name: 'Apex Residential Remodeling',
      city: location.split(',')[0].trim() || 'Dallas',
      email: 'info@apexremodelingtx.example',
      phone: '(214) 555-0199',
      website: 'None'
    }
  ].slice(0, maxResults);
}
