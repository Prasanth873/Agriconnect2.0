
const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const db = new Database("educonnect.db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SECRET = process.env.JWT_SECRET || "change-this-secret-before-deployment";

// Create database tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doubts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER,
 question TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT,
 category TEXT,
 description TEXT,
 link TEXT
);
`);

// Add sample learning resources
const count = db.prepare("SELECT COUNT(*) AS total FROM resources").get();

if (count.total === 0) {
  const insert = db.prepare(
    "INSERT INTO resources (title, category, description, link) VALUES (?, ?, ?, ?)"
  );

  [
    ["HTML Basics", "Study Materials", "Learn HTML fundamentals.", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content"],
    ["Python Programming", "Online Courses", "Learn Python programming.", "https://www.python.org/about/gettingstarted/"],
    ["Scholarship Portal", "Scholarships", "Find Indian scholarship information.", "https://scholarships.gov.in/"],
    ["Career Guidance", "Career Guidance", "Explore career opportunities.", "https://www.ncs.gov.in/"],
    ["Digital Learning", "E-Library", "Explore free digital learning.", "https://swayam.gov.in/"]
  ].forEach(item => insert.run(...item));
}

// Authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Please login first." });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired login." });
  }
}

// Student registration
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({
      message: "Enter all details. Password must have at least 8 characters."
    });
  }

  try {
    const hashed = bcrypt.hashSync(password, 12);

    const result = db.prepare(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
    ).run(name.trim(), email.trim().toLowerCase(), hashed);

    const token = jwt.sign(
      { id: result.lastInsertRowid, name: name.trim() },
      SECRET,
      { expiresIn: "2h" }
    );

    res.status(201).json({
      message: "Registration successful!",
      token,
      name: name.trim()
    });
  } catch {
    res.status(409).json({ message: "Email already registered." });
  }
});

// Student login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).get((email || "").trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password || "", user.password)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name },
    SECRET,
    { expiresIn: "2h" }
  );

  res.json({
    message: "Login successful!",
    token,
    name: user.name
  });
});

// Get student profile
app.get("/api/profile", authenticate, (req, res) => {
  const user = db.prepare(
    "SELECT id, name, email FROM users WHERE id = ?"
  ).get(req.user.id);

  if (!user) return res.status(404).json({ message: "Student not found." });

  res.json(user);
});

// Get learning resources
app.get("/api/resources", (req, res) => {
  const resources = db.prepare(
    "SELECT * FROM resources ORDER BY id"
  ).all();

  res.json(resources);
});

// Submit an academic doubt
app.post("/api/doubts", authenticate, (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ message: "Enter your question." });
  }

  db.prepare(
    "INSERT INTO doubts (user_id, question) VALUES (?, ?)"
  ).run(req.user.id, question.trim());

  res.status(201).json({
    message: "Your doubt has been submitted successfully!"
  });
});

// View student's doubts
app.get("/api/doubts", authenticate, (req, res) => {
  const doubts = db.prepare(
    "SELECT id, question, created_at FROM doubts WHERE user_id = ? ORDER BY id DESC"
  ).all(req.user.id);

  res.json(doubts);
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`EduConnect running on port ${PORT}`);
});
