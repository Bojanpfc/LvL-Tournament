async function loadRanking() {
  const tbody = document.querySelector('#rankingTable tbody');

  const { data, error } = await sb.from('results')
    .select('goals, player_id, players(name)');

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="hint">Could not load ranking.</td></tr>`;
    console.error(error);
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="hint">No results submitted yet.</td></tr>`;
    return;
  }

  const totals = {};
  data.forEach(r => {
    const name = r.players.name;
    if (!totals[name]) totals[name] = { goals: 0, tournaments: 0 };
    totals[name].goals += r.goals;
    totals[name].tournaments += 1;
  });

  const rows = Object.entries(totals)
    .sort((a, b) => b[1].goals - a[1].goals);

  tbody.innerHTML = rows.map(([name, t], i) => `
    <tr class="${i === 0 ? 'rank-1' : ''}">
      <td>${i + 1}</td>
      <td>${escapeHtml(name)}</td>
      <td class="num">${t.tournaments}</td>
      <td class="num">${t.goals}</td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

loadRanking();
