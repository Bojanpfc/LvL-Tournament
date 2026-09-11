let currentTournamentId = null;

async function init() {
  const { data: tournaments, error } = await sb.from('tournaments')
    .select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1);

  if (error || !tournaments.length) {
    document.getElementById('noTournamentPanel').style.display = 'block';
    return;
  }

  currentTournamentId = tournaments[0].id;

  const { data: tp, error: tpErr } = await sb.from('tournament_players')
    .select('player_id, players(id, name)')
    .eq('tournament_id', currentTournamentId);

  if (tpErr) { console.error(tpErr); return; }

  const players = tp.map(row => row.players).sort((a, b) => a.name.localeCompare(b.name));
  const select = document.getElementById('playerSelect');
  select.innerHTML = players.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

  document.getElementById('formPanel').style.display = 'block';
}

async function submitResult() {
  const playerId = document.getElementById('playerSelect').value;
  const goals = document.getElementById('goalsInput').value;
  const msg = document.getElementById('submitMsg');

  if (goals === '' || Number(goals) < 0) {
    msg.innerHTML = '<div class="msg err">Enter a valid number of goals.</div>';
    return;
  }

  // Check for an existing submission first, so we can show a clear message
  // (the database's unique constraint is the real safety net either way).
  const { data: existing } = await sb.from('results')
    .select('id').eq('tournament_id', currentTournamentId).eq('player_id', playerId);

  if (existing && existing.length) {
    msg.innerHTML = '<div class="msg err">You\'ve already submitted a result for this tournament.</div>';
    return;
  }

  const { error } = await sb.from('results').insert({
    tournament_id: currentTournamentId,
    player_id: playerId,
    goals: Number(goals)
  });

  if (error) {
    msg.innerHTML = error.message.includes('duplicate')
      ? '<div class="msg err">You\'ve already submitted a result for this tournament.</div>'
      : `<div class="msg err">${escapeHtml(error.message)}</div>`;
    return;
  }

  msg.innerHTML = '<div class="msg ok">Result submitted. Good luck!</div>';
  document.getElementById('goalsInput').value = '';
  document.getElementById('goalsInput').disabled = true;
  document.getElementById('submitBtn').disabled = true;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

init();
