// Hutchforge Lead Outreach Platform Client Script

let leadsData = [];
let currentTemplate = { subject: "", body: "" };

// Toast Notification
function showToast(message, type = 'info') {
  const banner = document.getElementById('toast-banner');
  banner.className = `toast-banner ${type}`;
  banner.textContent = message;
  banner.classList.remove('hidden');
  setTimeout(() => {
    banner.classList.add('hidden');
  }, 5000);
}

// Tab Switching
document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    switchTab(tabName);
  });
});

document.querySelectorAll('[data-tab-link]').forEach(el => {
  el.addEventListener('click', () => {
    const tabName = el.getAttribute('data-tab-link');
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

  const activeBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  const activePane = document.getElementById(`tab-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activePane) activePane.classList.add('active');

  if (tabName === 'leads') loadLeads();
  if (tabName === 'logs') loadLogs();
}

// 1. Fetch & Render Stats
async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    document.getElementById('stat-total-leads').textContent = data.totalLeads;
    document.getElementById('stat-new-leads').textContent = data.newLeads;
    document.getElementById('stat-sent-leads').textContent = data.sentLeads;
    document.getElementById('stat-failed-leads').textContent = data.failedLeads;
    document.getElementById('sidebar-lead-count').textContent = data.totalLeads;

    // Scheduler pill
    const pill = document.getElementById('scheduler-pill');
    const pillText = document.getElementById('scheduler-pill-text');
    if (data.scheduler.enabled) {
      pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      pillText.textContent = `Auto-Run: Active (${data.scheduler.time} ${data.scheduler.days})`;
    } else {
      pill.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      pillText.textContent = `Auto-Run: Disabled`;
    }
  } catch (err) {
    console.error("Failed loading status:", err);
  }
}

// 2. Fetch & Render Settings
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const s = await res.json();

    // Fill form
    document.getElementById('setting-sender-name').value = s.senderName || 'Team Hutchforge';
    document.getElementById('setting-titan-email').value = s.titanEmail || 'hello@hutchforge.in';
    document.getElementById('setting-titan-password').value = s.titanPassword || '';
    document.getElementById('setting-test-email').value = s.testEmail || 'contact@vyvhr.com';
    document.getElementById('setting-apify-token').value = s.apifyToken || '';
    document.getElementById('setting-niche').value = s.niche || '';
    document.getElementById('setting-location').value = s.location || '';
    document.getElementById('setting-only-without-websites').checked = !!s.onlyWithoutWebsites;
    document.getElementById('setting-autorun').checked = !!s.autoRunEnabled;
    document.getElementById('setting-schedule-time').value = s.scheduleTime || '09:00';
    document.getElementById('setting-schedule-days').value = s.scheduleDays || 'weekdays';
    document.getElementById('setting-batch-size').value = s.batchSize || 20;
    document.getElementById('setting-delay-seconds').value = s.delaySeconds || 45;

    // Fill dashboard quick info
    document.getElementById('dash-niche').textContent = s.niche || 'Builders & Construction';
    document.getElementById('dash-location').textContent = s.location || 'Dallas, TX';
    document.getElementById('dash-filter').textContent = s.onlyWithoutWebsites ? 'Only without websites' : 'All businesses';
    document.getElementById('dash-batch').textContent = `${s.batchSize || 20} emails/run`;
    document.getElementById('dash-email').textContent = s.titanEmail || 'hello@hutchforge.in';

    const smtpStatus = document.getElementById('dash-smtp-status');
    if (s.hasPassword) {
      smtpStatus.className = 'badge badge-success';
      smtpStatus.textContent = 'Configured';
    } else {
      smtpStatus.className = 'badge badge-warning';
      smtpStatus.textContent = 'Password Missing';
    }
  } catch (err) {
    console.error("Failed loading settings:", err);
  }
}

// Save Settings
document.getElementById('btn-save-settings').addEventListener('click', async () => {
  const payload = {
    senderName: document.getElementById('setting-sender-name').value,
    titanEmail: document.getElementById('setting-titan-email').value,
    titanPassword: document.getElementById('setting-titan-password').value,
    testEmail: document.getElementById('setting-test-email').value,
    apifyToken: document.getElementById('setting-apify-token').value,
    niche: document.getElementById('setting-niche').value,
    location: document.getElementById('setting-location').value,
    onlyWithoutWebsites: document.getElementById('setting-only-without-websites').checked,
    autoRunEnabled: document.getElementById('setting-autorun').checked,
    scheduleTime: document.getElementById('setting-schedule-time').value,
    scheduleDays: document.getElementById('setting-schedule-days').value,
    batchSize: parseInt(document.getElementById('setting-batch-size').value, 10),
    delaySeconds: parseInt(document.getElementById('setting-delay-seconds').value, 10)
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast("Settings successfully saved and scheduler updated!", "success");
      loadSettings();
      loadStatus();
    }
  } catch (err) {
    showToast(`Error saving settings: ${err.message}`, "error");
  }
});

// 3. Test Email Verification
async function triggerTestEmail(recipient) {
  showToast(`Sending test email to ${recipient}...`, "info");
  try {
    const res = await fetch('/api/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, "success");
    } else {
      showToast(`Test failed: ${result.error}`, "error");
    }
    loadLogs();
  } catch (err) {
    showToast(`Failed: ${err.message}`, "error");
  }
}

document.getElementById('btn-dash-test-email').addEventListener('click', () => {
  const target = document.getElementById('setting-test-email').value || 'contact@vyvhr.com';
  triggerTestEmail(target);
});

document.getElementById('btn-send-test-setting').addEventListener('click', () => {
  const target = document.getElementById('setting-test-email').value || 'contact@vyvhr.com';
  triggerTestEmail(target);
});

// 4. Template Editor & Live Preview
async function loadTemplate() {
  try {
    const res = await fetch('/api/template');
    currentTemplate = await res.json();
    document.getElementById('template-subject').value = currentTemplate.subject || '';
    document.getElementById('template-body').value = currentTemplate.body || '';
    updateLivePreview();
  } catch (err) {
    console.error("Failed loading template:", err);
  }
}

function updateLivePreview() {
  const subjectInput = document.getElementById('template-subject').value;
  const bodyInput = document.getElementById('template-body').value;

  const mockLead = {
    name: "Apex Builders & Contractors",
    city: "Dallas",
    phone: "(214) 555-0199",
    email: "contact@apexbuilders.example"
  };

  const render = (text) => text
    .replace(/{business_name}/gi, mockLead.name)
    .replace(/{city}/gi, mockLead.city)
    .replace(/{phone}/gi, mockLead.phone)
    .replace(/{email}/gi, mockLead.email);

  document.getElementById('preview-subject').textContent = render(subjectInput);
  document.getElementById('preview-body').textContent = render(bodyInput);
}

document.getElementById('template-subject').addEventListener('input', updateLivePreview);
document.getElementById('template-body').addEventListener('input', updateLivePreview);

window.insertTag = function(tag) {
  const bodyEl = document.getElementById('template-body');
  const start = bodyEl.selectionStart;
  const end = bodyEl.selectionEnd;
  const text = bodyEl.value;
  bodyEl.value = text.substring(0, start) + tag + text.substring(end);
  bodyEl.focus();
  bodyEl.selectionStart = bodyEl.selectionEnd = start + tag.length;
  updateLivePreview();
};

document.getElementById('btn-save-template').addEventListener('click', async () => {
  const payload = {
    subject: document.getElementById('template-subject').value,
    body: document.getElementById('template-body').value
  };

  try {
    const res = await fetch('/api/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast("Email template saved successfully!", "success");
    }
  } catch (err) {
    showToast(`Failed saving template: ${err.message}`, "error");
  }
});

// 5. Leads Table Management
async function loadLeads() {
  try {
    const res = await fetch('/api/leads');
    leadsData = await res.json();
    renderLeadsTable();
  } catch (err) {
    console.error("Failed loading leads:", err);
  }
}

function renderLeadsTable() {
  const tbody = document.getElementById('leads-table-body');
  const searchQuery = document.getElementById('lead-search').value.toLowerCase();
  const filterStatus = document.getElementById('lead-filter-status').value;

  const filtered = leadsData.filter(lead => {
    const matchesSearch = (lead.name || '').toLowerCase().includes(searchQuery) ||
                          (lead.city || '').toLowerCase().includes(searchQuery) ||
                          (lead.email || '').toLowerCase().includes(searchQuery);
    const matchesStatus = filterStatus === 'ALL' || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">No leads match your filter. Click "Scrape Now" to discover businesses!</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(lead => {
    let badgeClass = 'badge-blue';
    if (lead.status === 'SENT') badgeClass = 'badge-success';
    if (lead.status === 'FAILED') badgeClass = 'badge-danger';

    return `
      <tr>
        <td><input type="checkbox" class="lead-checkbox" value="${lead.id}"></td>
        <td><strong>${lead.name}</strong></td>
        <td>${lead.city || 'N/A'}</td>
        <td><span style="font-family: monospace;">${lead.email}</span></td>
        <td>${lead.phone || 'N/A'}</td>
        <td><span class="badge ${lead.website === 'None' ? 'badge-warning' : 'badge-blue'}">${lead.website === 'None' ? 'No Website' : 'Social Only'}</span></td>
        <td><span class="badge ${badgeClass}">${lead.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="deleteSingleLead('${lead.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

document.getElementById('lead-search').addEventListener('input', renderLeadsTable);
document.getElementById('lead-filter-status').addEventListener('change', renderLeadsTable);

document.getElementById('select-all-leads').addEventListener('change', (e) => {
  const checked = e.target.checked;
  document.querySelectorAll('.lead-checkbox').forEach(cb => cb.checked = checked);
});

window.deleteSingleLead = async function(id) {
  try {
    await fetch('/api/leads/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] })
    });
    loadLeads();
    loadStatus();
  } catch (err) {
    showToast(`Error deleting lead: ${err.message}`, "error");
  }
};

document.getElementById('btn-clear-leads').addEventListener('click', async () => {
  if (!confirm("Are you sure you want to clear all leads from the table?")) return;
  try {
    await fetch('/api/leads/clear', { method: 'POST' });
    showToast("Leads cleared.", "info");
    loadLeads();
    loadStatus();
  } catch (err) {
    showToast(`Error clearing leads: ${err.message}`, "error");
  }
});

document.getElementById('btn-export-csv').addEventListener('click', () => {
  if (leadsData.length === 0) {
    showToast("No leads to export.", "warning");
    return;
  }
  const headers = ["BusinessName", "City", "Email", "Phone", "Website", "Status", "DiscoveredAt"];
  const rows = leadsData.map(l => [
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.city || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.website || '').replace(/"/g, '""')}"`,
    l.status,
    l.discoveredAt || ''
  ].join(','));

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `hutchforge_leads_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// 6. Action Triggers (Scrape, Send, Full)
document.getElementById('btn-quick-scrape').addEventListener('click', async () => {
  showToast("Scraping triggered in background...", "info");
  await fetch('/api/actions/run-scrape', { method: 'POST' });
  setTimeout(() => { loadStatus(); loadLeads(); loadLogs(); }, 3000);
});

document.getElementById('btn-quick-send').addEventListener('click', async () => {
  showToast("Email sending triggered in background...", "info");
  await fetch('/api/actions/run-send', { method: 'POST' });
  setTimeout(() => { loadStatus(); loadLeads(); loadLogs(); }, 3000);
});

document.getElementById('btn-quick-full').addEventListener('click', async () => {
  showToast("Full cycle (Scrape & Send) triggered in background...", "info");
  await fetch('/api/actions/run-full', { method: 'POST' });
  setTimeout(() => { loadStatus(); loadLeads(); loadLogs(); }, 3000);
});

document.getElementById('btn-send-selected').addEventListener('click', async () => {
  showToast("Starting dispatch for selected leads...", "info");
  await fetch('/api/actions/run-send', { method: 'POST' });
});

// 7. Activity Logs
async function loadLogs() {
  try {
    const res = await fetch('/api/logs');
    const logs = await res.json();

    const formatLogs = (items) => {
      if (items.length === 0) return '<div>No logs recorded yet.</div>';
      return items.map(l => {
        const time = new Date(l.timestamp).toLocaleTimeString();
        return `
          <div class="log-entry">
            <span class="log-time">[${time}]</span>
            <span class="log-${l.type}">[${l.type}]</span>
            <span class="log-msg">${l.message}</span>
          </div>
        `;
      }).join('');
    };

    const dashLogs = document.getElementById('dashboard-logs');
    if (dashLogs) dashLogs.innerHTML = formatLogs(logs.slice(0, 10));

    const fullLogs = document.getElementById('full-logs');
    if (fullLogs) fullLogs.innerHTML = formatLogs(logs);
  } catch (err) {
    console.error("Failed loading logs:", err);
  }
}

document.getElementById('btn-refresh-logs').addEventListener('click', loadLogs);
document.getElementById('btn-refresh-all-logs').addEventListener('click', loadLogs);

// Initialize on Load & Live Polling
window.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  loadSettings();
  loadTemplate();
  loadLogs();
  loadLeads();

  // Poll status and logs every 5 seconds
  setInterval(() => {
    loadStatus();
    loadLogs();
  }, 5000);
});
