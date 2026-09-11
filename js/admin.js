// Inicijalizacija Supabase klijenta
let db;

try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("Greška pri inicijalizaciji Supabase-a:", e);
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const adminContent = document.getElementById("admin-content");
  const authSection = document.getElementById("auth-section");
  const passwordInput = document.getElementById("admin-password");
  const addPlayerForm = document.getElementById("add-player-form");
  const playerList = document.getElementById("player-list");
  const poolSizeEl = document.getElementById("pool-size");
  const startBtn = document.getElementById("start-tournament-btn");

  // Prijava
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (passwordInput.value === ADMIN_PASSWORD) {
        authSection.style.display = "none";
        adminContent.style.display = "block";
        loadPlayers();
        checkActiveTournament();
      } else {
        alert("Netačna lozinka!");
      }
    });
  }

  // Učitavanje igrača sa štampanjem checkbox-a
  async function loadPlayers() {
    if (!db) return;
    try {
      const { data, error } = await db.from("players").select("*").order("name");
      if (error) throw error;

      if (playerList) playerList.innerHTML = "";
      if (poolSizeEl) poolSizeEl.textContent = data ? data.length : 0;

      if (data && playerList) {
        data.forEach((p) => {
          const li = document.createElement("li");
          li.style.display = "flex";
          li.style.alignItems = "center";
          li.style.gap = "10px";
          li.style.marginBottom = "5px";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = p.name;
          cb.checked = true;
          cb.className = "player-select-cb";

          const span = document.createElement("span");
          span.textContent = `${p.name} ${p.discord_id ? "(" + p.discord_id + ")" : ""}`;

          li.appendChild(cb);
          li.appendChild(span);
          playerList.appendChild(li);
        });
      }
    } catch (err) {
      console.error("Greška pri učitavanju igrača:", err);
    }
  }

  // Dodavanje igrača
  if (addPlayerForm) {
    addPlayerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("player-name");
      const discordInput = document.getElementById("discord-id");
      const name = nameInput.value.trim();
      const discord_id = discordInput.value.trim();

      if (!name) return;

      try {
        const { error } = await db.from("players").insert([{ name, discord_id }]);
        if (error) throw error;

        nameInput.value = "";
        discordInput.value = "";
        loadPlayers();
      } catch (err) {
        alert(err.message || "Greška pri dodavanju.");
      }
    });
  }

  // Provera aktivnog turnira
  async function checkActiveTournament() {
    if (!db) return;
    try {
      const { data, error } = await db
        .from("tournaments")
        .select("*")
        .eq("status", "active")
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        if (startBtn) {
          startBtn.textContent = "TURNIR JE VEĆ U TOKU";
          startBtn.style.backgroundColor = "#555";
        }
      } else {
        if (startBtn) {
          startBtn.textContent = "START TOURNAMENT";
          startBtn.style.backgroundColor = "";
        }
      }
    } catch (err) {
      console.error("Greška pri proveri:", err);
    }
  }

  // Pokretanje novog turnira
  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      const checkedBoxes = document.querySelectorAll(".player-select-cb:checked");
      const selectedPlayers = Array.from(checkedBoxes).map(cb => cb.value);

      if (selectedPlayers.length < 2) {
        alert("Moraš izabrati bar 2 igrača za turnir!");
        return;
      }

      // Mešanje igrača
      const shuffled = [...selectedPlayers].sort(() => 0.5 - Math.random());
      const matches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matches.push({ player1: shuffled[i], player2: shuffled[i+1], score1: null, score2: null });
        } else {
          matches.push({ player1: shuffled[i], player2: "BYE", score1: null, score2: null });
        }
      }

      try {
        const { error } = await db.from("tournaments").insert([{
          name: "Tournament " + new Date().toLocaleDateString('sr-RS'),
          status: "active",
          players: selectedPlayers,
          bracket: matches
        }]);

        if (error) throw error;

        alert("Turnir je uspešno pokrenut!");
        checkActiveTournament();
      } catch (err) {
        alert("Greška pri pokretanju turnira: " + err.message);
      }
    });
  }
});
