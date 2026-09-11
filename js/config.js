// Globalna inicijalizacija Supabase klijenta
let db;

try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error("Supabase SDK nije učitan.");
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

  // Provera lozinke
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (passwordInput.value === ADMIN_PASSWORD) {
        authSection.style.display = "none";
        adminContent.style.display = "block";
        loadPlayers();
      } else {
        alert("Netačna lozinka!");
      }
    });
  }

  // Učitavanje igrača
  async function loadPlayers() {
    if (!db) return;
    try {
      const { data, error } = await db.from("players").select("*").order("name");
      if (error) throw error;

      playerList.innerHTML = "";
      if (poolSizeEl) poolSizeEl.textContent = data ? data.length : 0;

      if (data) {
        data.forEach((p) => {
          const li = document.createElement("li");
          li.textContent = `${p.name} ${p.discord_id ? "(" + p.discord_id + ")" : ""}`;
          playerList.appendChild(li);
        });
      }
    } catch (err) {
      console.error("Greška pri učitavanju:", err);
    }
  }

  // Dodavanje igrača
  if (addPlayerForm) {
    addPlayerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("player-name");
      const discordInput = document.getElementById("discord-id");
      const errorEl = document.getElementById("add-player-error");

      if (errorEl) errorEl.textContent = "";

      const name = nameInput.value.trim();
      const discord_id = discordInput.value.trim();

      if (!name) return;

      try {
        const { data, error } = await db
          .from("players")
          .insert([{ name, discord_id }]);

        if (error) throw error;

        nameInput.value = "";
        discordInput.value = "";
        loadPlayers();
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message || "Greška pri povezivanju sa bazom.";
        }
      }
    });
  }
});
