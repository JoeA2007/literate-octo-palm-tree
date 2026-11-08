(() => {
  const STORAGE_KEY = 'local-launchpad-leads-v1';
  const stages = ['Researching', 'Ready to contact', 'Contacted', 'In conversation', 'Won', 'Closed'];
  const $ = (id) => document.getElementById(id);
  const dialog = $('leadDialog');
  let leads = readLeads();

  function readLeads() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(x => x && typeof x.id === 'string' && typeof x.name === 'string') : [];
    } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(leads)); render(); }
    catch { toast('Could not save. Export your notes and clear browser storage.'); }
  }
  function toast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function safeUrl(raw) {
    try { const u = new URL(raw); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; }
    catch { return ''; }
  }
  function render() {
    const query = $('searchInput').value.trim().toLowerCase();
    const filter = $('filterStatus').value;
    const shown = leads.filter(lead => (filter === 'all' || lead.status === filter) &&
      [lead.name, lead.url, lead.opportunity, lead.notes].join(' ').toLowerCase().includes(query));
    $('countAll').textContent = String(leads.length).padStart(2, '0');
    $('countReview').textContent = String(leads.filter(x => ['Researching', 'Ready to contact'].includes(x.status)).length).padStart(2, '0');
    $('countContact').textContent = String(leads.filter(x => ['Contacted', 'In conversation'].includes(x.status)).length).padStart(2, '0');
    $('emptyState').hidden = shown.length > 0;
    $('leadRows').replaceChildren(...shown.map(lead => {
      const tr = document.createElement('tr');
      const business = document.createElement('td');
      const url = safeUrl(lead.url);
      if (url) { const a = document.createElement('a'); a.className = 'business-link'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = lead.name; business.append(a); }
      else business.textContent = lead.name;
      const opportunity = document.createElement('td'); opportunity.textContent = lead.opportunity || '—';
      const stage = document.createElement('td'); const badge = document.createElement('span'); badge.className = `stage ${lead.status.replaceAll(' ', '')}`; badge.textContent = lead.status; stage.append(badge);
      const follow = document.createElement('td'); follow.textContent = lead.followUp ? new Date(`${lead.followUp}T12:00:00`).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'}) : '—';
      const actions = document.createElement('td');
      const edit = document.createElement('button'); edit.className = 'row-action'; edit.textContent = 'Edit'; edit.setAttribute('aria-label', `Edit ${lead.name}`); edit.addEventListener('click', () => openForm(lead));
      const remove = document.createElement('button'); remove.className = 'row-action'; remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${lead.name}`); remove.addEventListener('click', () => { if (confirm(`Delete ${lead.name} from this browser?`)) { leads = leads.filter(x => x.id !== lead.id); save(); } });
      actions.append(edit, remove); tr.append(business, opportunity, stage, follow, actions); return tr;
    }));
    renderDraftOptions();
  }
  function renderDraftOptions() {
    const select = $('draftLeadSelect');
    const selected = select.value;
    const eligible = leads.filter(x => x.opportunity && x.opportunity.trim());
    select.replaceChildren(new Option('Choose from your pipeline…', ''), ...eligible.map(lead => new Option(lead.name, lead.id)));
    if (eligible.some(x => x.id === selected)) select.value = selected;
    updateDraft();
  }
  function updateDraft() {
    const lead = leads.find(x => x.id === $('draftLeadSelect').value);
    $('draftEmpty').hidden = Boolean(lead);
    $('draftResults').hidden = !lead;
    if (!lead) return;
    const business = lead.name.trim();
    const note = lead.opportunity.trim().replace(/[.!?]+$/, '');
    const url = safeUrl(lead.url);
    $('auditOutput').value = `Website refresh opportunity for ${business}\n\nWhat I noticed\n${lead.opportunity.trim()}\n\nA possible next step\nReview the page on a phone and make the key service information and contact option easy to find. This is a suggestion to verify during your own review, not a claim that the current site is failing.\n\nScope to explore\nA focused one-page refresh could clarify the main offer, improve mobile readability, and make the next action easier to spot.${url ? `\n\nPublic website reviewed: ${url}` : ''}`;
    $('messageOutput').value = `Subject: A small website idea for ${business}\n\nHello ${business} team,\n\nI was looking at your public website and noticed that ${note.charAt(0).toLowerCase()}${note.slice(1)}.\n\nI’m building a small web design service focused on clear, mobile-friendly one-page sites. I had an idea for how this part of the experience could be made easier for visitors. If it would be useful, I can send you a short example—no pressure either way.\n\nWould you be open to taking a look? If this isn’t relevant, just let me know and I won’t follow up.\n\nThanks,\n[Your name]`;
  }
  async function copyDraft(elementId) {
    const value = $(elementId).value;
    try { await navigator.clipboard.writeText(value); toast('Draft copied. Review and personalize it before use.'); }
    catch { $(elementId).focus(); $(elementId).select(); toast('Select and copy the draft, then review it before use.'); }
  }
  function openForm(lead) {
    $('leadForm').reset(); $('leadId').value = lead?.id || '';
    $('dialogTitle').innerHTML = lead ? 'Edit a <em>prospect.</em>' : 'Add a <em>prospect.</em>';
    $('businessName').value = lead?.name || ''; $('website').value = lead?.url || '';
    $('opportunity').value = lead?.opportunity || ''; $('leadStatus').value = lead?.status || stages[0];
    $('followUp').value = lead?.followUp || ''; $('notes').value = lead?.notes || '';
    dialog.showModal(); $('businessName').focus();
  }
  $('addLeadBtn').addEventListener('click', () => openForm());
  $('emptyAddBtn').addEventListener('click', () => openForm());
  $('closeDialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  $('searchInput').addEventListener('input', render);
  $('filterStatus').addEventListener('change', render);
  $('draftLeadSelect').addEventListener('change', updateDraft);
  $('copyAuditBtn').addEventListener('click', () => copyDraft('auditOutput'));
  $('copyMessageBtn').addEventListener('click', () => copyDraft('messageOutput'));
  $('leadForm').addEventListener('submit', event => {
    event.preventDefault();
    const id = $('leadId').value || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    const lead = { id, name: $('businessName').value.trim(), url: $('website').value.trim(), opportunity: $('opportunity').value.trim(), status: $('leadStatus').value, followUp: $('followUp').value, notes: $('notes').value.trim(), updatedAt: new Date().toISOString() };
    const index = leads.findIndex(x => x.id === id);
    if (index < 0) leads.unshift(lead); else leads[index] = lead;
    save(); dialog.close(); toast('Prospect saved in this browser.');
  });
  $('exportBtn').addEventListener('click', () => {
    if (!leads.length) { toast('Add a prospect before exporting.'); return; }
    const fields = ['name', 'url', 'opportunity', 'status', 'followUp', 'notes', 'updatedAt'];
    const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [fields.join(','), ...leads.map(lead => fields.map(key => csvCell(lead[key])).join(','))].join('\r\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'}); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `local-launchpad-leads-${new Date().toISOString().slice(0,10)}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000); toast('Lead backup downloaded.');
  });
  render();
})();

