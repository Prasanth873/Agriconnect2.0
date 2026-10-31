
const API = "/api";
let token = localStorage.getItem("eduToken");

function message(text) {
  document.getElementById("message").innerText = text;
}

// Register student
async function register() {
  const data = {
    name: document.getElementById("regName").value,
    email: document.getElementById("regEmail").value,
    password: document.getElementById("regPassword").value
  };

  try {
    const res = await fetch(API + "/register", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) return message(result.message);

    token = result.token;
    localStorage.setItem("eduToken", token);
    message(result.message);
    updateStudent(result.name);
  } catch {
    message("Cannot connect to server.");
  }
}

// Login student
async function login() {
  const data = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value
  };

  try {
    const res = await fetch(API + "/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) return message(result.message);

    token = result.token;
    localStorage.setItem("eduToken", token);
    message(result.message);
    updateStudent(result.name);
  } catch {
    message("Cannot connect to server.");
  }
}

// Update student dashboard
function updateStudent(name) {
  document.getElementById("studentName").innerText = name;
  document.getElementById("studentArea").hidden = false;
}

// Restore login
async function restoreLogin() {
  if (!token) return;

  try {
    const res = await fetch(API + "/profile", {
      headers: {Authorization: "Bearer " + token}
    });

    if (!res.ok) return logout();

    const user = await res.json();
    updateStudent(user.name);
  } catch {
    message("Could not connect to server.");
  }
}

// Logout
function logout() {
  localStorage.removeItem("eduToken");
  token = null;
  document.getElementById("studentArea").hidden = true;
  message("Logged out successfully.");
}

// Load educational resources
async function loadResources() {
  try {
    const res = await fetch(API + "/resources");
    const resources = await res.json();
    const area = document.getElementById("resourceCards");

    area.innerHTML = resources.map(item => `
      <div class="card">
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <small>${escapeHTML(item.category)}</small>
        <br><br>
        <a href="${safeLink(item.link)}" target="_blank"
           rel="noopener noreferrer">Explore →</a>
      </div>
    `).join("");

    document.getElementById("search").addEventListener("input", searchResources);
  } catch {
    document.getElementById("resourceCards").innerText =
      "Unable to load resources.";
  }
}

// Safe display of text
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function safeLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

// Search resources
function searchResources() {
  const value = document.getElementById("search").value.toLowerCase();

  document.querySelectorAll("#resourceCards .card").forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(value)
      ? "block" : "none";
  });
}

// Submit academic doubt
async function submitDoubt() {
  if (!token) return message("Please login first.");

  const question = document.getElementById("question").value;

  try {
    const res = await fetch(API + "/doubts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({question})
    });

    const result = await res.json();
    message(result.message);

    if (res.ok) {
      document.getElementById("question").value = "";
      showDoubts();
    }
  } catch {
    message("Cannot connect to server.");
  }
}

// View submitted doubts
async function showDoubts() {
  try {
    const res = await fetch(API + "/doubts", {
      headers: {Authorization: "Bearer " + token}
    });

    const doubts = await res.json();

    if (!res.ok) return message(doubts.message);

    document.getElementById("myDoubts").innerHTML =
      "<h3>My Submitted Doubts</h3>" +
      (doubts.length
        ? doubts.map(d => `<p>${escapeHTML(d.question)}</p>`).join("")
        : "<p>No doubts submitted yet.</p>");
  } catch {
    message("Unable to load doubts.");
  }
}

loadResources();
restoreLogin();
