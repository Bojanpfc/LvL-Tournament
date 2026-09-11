// Globalna inicijalizacija Supabase klijenta
let db;

try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("Greška pri inicijalizaciji Supabase-a:", e);
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector("main") || document.body;

  if (!db) {
    console.error("Baza nije povezana.");
    return;
  }

  try {
    // Pronađi aktivni turnir
    const { data: tournaments, error } = await db
      .from("tournaments")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!tournaments || tournaments.length === 0) {
      const msg = document.createElement("p");
      msg.style.color = "#fff";
      msg.style.textAlign = "center";
      msg.style.marginTop = "20px";
      msg.textContent = "Trenutno nema aktivnog turnira.";
      container.appendChild(msg);
      return;
    }

    const activeTournament = tournaments[0];
    
    // Provera da li postoji forma za unosenje rezultata
    const playerSelect = document.getElementById("player-select");
    const tournamentTitle = document.getElementById("tournament-title");

    if (tournamentTitle) {
      tournamentTitle.textContent = activeTournament.name || "Aktivni Turnir";
    }

    // Popunjavanje padajuće liste igračima
    if (playerSelect && activeTournament.players) {
      playerSelect.innerHTML = '<option value="">Izaberi igrača...</option>';
      let playersList = activeTournament.players;
      
      if (typeof playersList === 'string') {
        playersList = JSON.parse(playersList);
      }

      playersList.forEach((player) => {
        const opt = document.createElement("option");
        opt.value = typeof player === 'object' ? player.name : player;
        opt.textContent = typeof player === 'object' ? player.name : player;
        playerSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Greška pri učitavanju turnira:", err);
  }
});
