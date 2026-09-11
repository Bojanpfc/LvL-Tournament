// Inicijalizacija Supabase klijenta
var db;

if (typeof supabase !== 'undefined' && supabase.createClient) {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener("DOMContentLoaded", function () {
  var loginForm = document.getElementById("login-form");
  var adminContent = document.getElementById("admin-content");
  var authSection = document.getElementById("auth-section");
  var passwordInput = document.getElementById("admin-password");
  var addPlayerForm = document.getElementById("add-player-form");
  var playerList = document.getElementById("player-list");
  var poolSizeEl = document.getElementById("pool-size");
  var startBtn = document.getElementById("start-tournament-btn");

  // Prijava na admin panel
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var entered = passwordInput ? passwordInput.value.trim() : "";
      
      if (entered === "12345") {
        if (authSection) authSection.style.display = "none";
        if (adminContent) adminContent.style.display = "block";
        loadPlayers();
      } else {
        alert("Netačna lozinka!");
      }
    });
  }

  // Učitavanje spiska igrača
  function loadPlayers() {
    if (!db) return;
    
    db.from("players").select("*").order("name").then(function (res) {
      if (res.error) {
        alert("Greška pri učitavanju: " + res.error.message);
        return;
      }
      
      var data = res.data || [];
      if (playerList) playerList.innerHTML = "";
      if (poolSizeEl) poolSizeEl.textContent = data.length;

      data.forEach(function (p) {
        var li = document.createElement("li");
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.gap = "10px";
        li.style.marginBottom = "5px";

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = p.name;
        cb.checked = true;
        cb.className = "player-select-cb";

        var span = document.createElement("span");
        span.textContent = p.name + (p.discord_id ? " (" + p.discord_id + ")" : "");

        li.appendChild(cb);
        li.appendChild(span);
        if (playerList) playerList.appendChild(li);
      });
    });
  }

  // Dodavanje igrača
  if (addPlayerForm) {
    addPlayerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameInput = document.getElementById("player-name");
      var discordInput = document.getElementById("discord-id");

      var name = nameInput ? nameInput.value.trim() : "";
      var discord_id = discordInput ? discordInput.value.trim() : "";

      if (!name) {
        alert("Unesi ime igrača!");
        return;
      }

      if (!db) {
        alert("Baza nije povezana!");
        return;
      }

      db.from("players").insert([{ name: name, discord_id: discord_id }]).then(function (res) {
        if (res.error) {
          alert("Greška iz baze: " + res.error.message);
        } else {
          if (nameInput) nameInput.value = "";
          if (discordInput) discordInput.value = "";
          loadPlayers();
        }
      });
    });
  }

  // Pokretanje turnira
  if (startBtn) {
    startBtn.addEventListener("click", function () {
      var checked = document.querySelectorAll(".player-select-cb:checked");
      var selected = [];
      
      checked.forEach(function (cb) {
        selected.push(cb.value);
      });

      if (selected.length < 2) {
        alert("Moraš izabrati bar 2 igrača!");
        return;
      }

      var shuffled = selected.slice().sort(function () { return 0.5 - Math.random(); });
      var matches = [];

      for (var i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matches.push({ player1: shuffled[i], player2: shuffled[i + 1], score1: null, score2: null });
        } else {
          matches.push({ player1: shuffled[i], player2: "BYE", score1: null, score2: null });
        }
      }

      db.from("tournaments").insert([{
        name: "Turnir " + new Date().toLocaleDateString('sr-RS'),
        status: "active",
        players: selected,
        bracket: matches
      }]).then(function (res) {
        if (res.error) {
          alert("Greška pri pokretanju: " + res.error.message);
        } else {
          alert("Turnir je uspešno pokrenut!");
        }
      });
    });
  }
});
