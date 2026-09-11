let tournaments = [];

async function initTournamentList() {
  const { data, error } = await sb.from('tournaments')
    .select('*').order('created_at', { ascending: false });

  const select = document.getElementById('tournamentSelect');

  if (error || !data.length) {
    select.innerHTML = '<option>No tournaments yet</option>';
    document.querySelector('#resultsTable tbody').innerHTML =
      '<tr><td colspan="3" class="hint">No tournaments yet.</td></tr>';
    return;
  }

  tournaments = data;
  select.innerHTML = data.map((t, i) => {
    const date = new Date(t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const label = `${date} — ${t.status === 'active' ? 'Live' : 'Completed'}`;
    return `<option value="${t.id}" ${i === 0 ? 'selected' : ''}>${label}</option>`;
  }).join('');

  loadResults();
}

async function loadResults() {
  const tournamentId = document.getElementById('tournamentSelect').value;
  const tbody = document.querySelector('#resultsTable tbody');
  tbody.innerHTML = '<tr><td colspan="3" class="hint">Loading…</td></tr>';

  const { data, error } = await sb.from('results')
    .select('goals, players(name)')
    .eq('tournament_id', tournamentId)
    .order('goals', { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="3" class="hint">Could not load results.</td></tr>';
    console.error(error);
    return;
  }

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="hint">No results submitted for this tournament yet.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((r, i) => `
    <tr class="${i === 0 ? 'rank-1' : ''}">
      <td>${i + 1}</td>
      <td>${escapeHtml(r.players.name)}</td>
      <td class="num">${r.goals}</td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

initTournamentList();
