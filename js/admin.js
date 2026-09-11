const REQUIRED_PLAYERS = 32;
let activeTournamentId = null;
let poolPlayers = [];

// ---------- login ----------
function tryLogin() {
  const val = document.getElementById('passwordInput').value;
  if (val === ADMIN_PASSWORD) {
    sessionStorage.setItem('fc_admin_ok', 'yes');
    showAdmin();
  } else {
    document.getElementById('loginMsg').innerHTML =
      '<div class="msg err">Wrong password.</div>';
  }
}

function showAdmin() {
  document.getElementById('loginPanel').style.display = 'none';
  document.getElementById('adminContent').style.display = 'block';
  loadPool();
  loadActiveTournament();
}

if (sessionStorage.getItem('fc_admin_ok') === 'yes') {
  showAdmin();
}

// ---------- player pool ----------
async function loadPool() {
  const { data, error } = await sb.from('players').select('*').order('name');
  if (error) { console.error(error); return; }
  poolPlayers = data;
  document.getElementById('poolCount').textContent = data.length;

  const tbody = document.querySelector('#poolTable tbody');
  tbody.innerHTML = data.map(p =>
    `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.discord_id || '—')}</td></tr>`
  ).join('');

  renderCheckboxes();
}

async function addPlayer() {
  const nameEl = document.getElementById('newPlayerName');
  const discordEl = document.getElementById('newPlayerDiscord');
  const name = nameEl.value.trim();
  const discordId = discordEl.value.trim();
  const msg = document.getElementById('addPlayerMsg');

  if (!name) {
    msg.innerHTML = '<div class="msg err">Enter a name first.</div>';
    return;
  }

  const { error } = await sb.from('players').insert({ name, discord_id: discordId || null });
  if (error) {
    msg.innerHTML = `<div class="msg err">${error.message.includes('duplicate') ? 'That name already exists.' : escapeHtml(error.message)}</div>`;
    return;
  }
  nameEl.value = '';
  discordEl.value = '';
  msg.innerHTML = '<div class="msg ok">Player added.</div>';
  loadPool();
}

// ---------- starting a tournament ----------
function renderCheckboxes() {
  const container = document.getElementById('playerCheckboxes');
  container.innerHTML = poolPlayers.map(p => `
    <div class="checkbox-row">
      <input type="checkbox" value="${p.id}" onchange="updateSelectedCount()">
      <span>${escapeHtml(p.name)}</span>
    </div>
  `).join('');
}

function updateSelectedCount() {
  const checked = document.querySelectorAll('#playerCheckboxes input:checked');
  document.getElementById('selectedCount').textContent = checked.length;
  document.getElementById('startBtn').disabled = checked.length !== REQUIRED_PLAYERS;
}

async function startTournament() {
  const checked = [...document.querySelectorAll('#playerCheckboxes input:checked')].map(el => el.value);
  const msg = document.getElementById('startMsg');
  if (checked.length !== REQUIRED_PLAYERS) return;

  const { data: tourney, error: tErr } = await sb.from('tournaments')
    .insert({ status: 'active' }).select().single();
  if (tErr) { msg.innerHTML = `<div class="msg err">${escapeHtml(tErr.message)}</div>`; return; }

  const rows = checked.map(playerId => ({ tournament_id: tourney.id, player_id: playerId }));
  const { error: tpErr } = await sb.from('tournament_players').insert(rows);
  if (tpErr) { msg.innerHTML = `<div class="msg err">${escapeHtml(tpErr.message)}</div>`; return; }

  msg.innerHTML = '<div class="msg ok">Tournament started!</div>';
  loadActiveTournament();
}

// ---------- active tournament / submission status ----------
async function loadActiveTournament() {
  const { data, error } = await sb.from('tournaments')
    .select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1);
  if (error) { console.error(error); return; }

  if (!data.length) {
    activeTournamentId = null;
    document.getElementById('activePanel').style.display = 'none';
    document.getElementById('startPanel').style.display = 'block';
    return;
  }

  activeTournamentId = data[0].id;
  document.getElementById('startPanel').style.display = 'none';
  document.getElementById('activePanel').style.display = 'block';
  loadSubmissionStatus();
}

async function loadSubmissionStatus() {
  const { data: tp, error: tpErr } = await sb.from('tournament_players')
    .select('player_id, players(name, discord_id)')
    .eq('tournament_id', activeTournamentId);
  if (tpErr) { console.error(tpErr); return; }

  const { data: results, error: rErr } = await sb.from('results')
    .select('player_id, goals').eq('tournament_id', activeTournamentId);
  if (rErr) { console.error(rErr); return; }

  const resultMap = {};
  results.forEach(r => resultMap[r.player_id] = r.goals);

  document.getElementById('submittedCount').textContent = results.length;

  const tbody = document.querySelector('#statusTable tbody');
  tbody.innerHTML = tp
    .sort((a, b) => a.players.name.localeCompare(b.players.name))
    .map(row => {
      const submitted = resultMap.hasOwnProperty(row.player_id);
      return `<tr>
        <td>${escapeHtml(row.players.name)}</td>
        <td><span class="status-dot ${submitted ? 'done' : 'pending'}"></span>${submitted ? 'Submitted' : 'Pending'}</td>
        <td class="num">${submitted ? resultMap[row.player_id] : '—'}</td>
      </tr>`;
    }).join('');

  // stash the pending list for the reminder button
  window._pendingPlayers = tp.filter(row => !resultMap.hasOwnProperty(row.player_id))
    .map(row => row.players);
}

async function remindPlayers() {
  const msg = document.getElementById('activeMsg');
  const pending = window._pendingPlayers || [];
  if (!pending.length) {
    msg.innerHTML = '<div class="msg ok">Everyone has already submitted!</div>';
    return;
  }
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.startsWith('PASTE_')) {
    msg.innerHTML = '<div class="msg err">Discord webhook URL is not set up in config.js yet.</div>';
    return;
  }

  const mentions = pending.map(p => p.discord_id ? `<@${p.discord_id}>` : p.name).join(' ');
  const content = `⏰ Reminder: please submit your goals for the current tournament! ${mentions}`;

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Webhook request failed');
    msg.innerHTML = `<div class="msg ok">Reminder sent to ${pending.length} player(s).</div>`;
  } catch (e) {
    msg.innerHTML = `<div class="msg err">Could not send reminder: ${escapeHtml(e.message)}</div>`;
  }
}

async function endTournament() {
  if (!activeTournamentId) return;
  if (!confirm('End this tournament? Players will no longer be able to submit results for it.')) return;
  const { error } = await sb.from('tournaments')
    .update({ status: 'completed' }).eq('id', activeTournamentId);
  if (error) { console.error(error); return; }
  loadActiveTournament();
  loadPool();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
