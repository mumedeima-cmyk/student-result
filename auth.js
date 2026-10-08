const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SECRET = process.env.JWT_SECRET || "dev-only-secret";

function who(req) {
  const m = (req.headers.cookie || "").match(/(?:^|;\s*)token=([^;]+)/);
  try { return jwt.verify(m ? m[1] : "", SECRET); } catch { return null; }
}

module.exports = function (app) {
  (async () => {
    try {
      const c = await pool.query("SELECT COUNT(*) FROM users");
      if (Number(c.rows[0].count) === 0 && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
        const h = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await pool.query("INSERT INTO users (username, password_hash, role) VALUES ($1,$2,'admin')",
          [process.env.ADMIN_USERNAME, h]);
        console.log("Admin account created");
      }
    } catch (e) { console.error(e); }
  })();

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body || {};
    try {
      const r = await pool.query("SELECT * FROM users WHERE username = $1", [String(username || "").trim()]);
      const u = r.rows[0];
      if (!u || !(await bcrypt.compare(String(password || ""), u.password_hash)))
        return res.status(401).json({ error: "Wrong username or password" });
      const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, SECRET, { expiresIn: "8h" });
      res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: !!process.env.RENDER, maxAge: 8 * 3600 * 1000 });
      res.json({ username: u.username, role: u.role });
    } catch (e) { res.status(500).json({ error: "Login failed" }); }
  });

  app.post("/api/logout", (req, res) => { res.clearCookie("token"); res.json({ ok: true }); });

  app.use("/api", (req, res, next) => {
    const user = who(req);
    if (!user) return res.status(401).json({ error: "Please log in" });
    req.user = user;
    next();
  });

  app.get("/api/me", (req, res) => res.json(req.user));

  app.post("/api/users", async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
    const { username, password } = req.body || {};
    if (!username || !password || password.length < 6)
      return res.status(400).json({ error: "Username and a password of 6+ characters needed" });
    try {
      const h = await bcrypt.hash(password, 10);
      await pool.query("INSERT INTO users (username, password_hash, role) VALUES ($1,$2,'teacher')", [username.trim(), h]);
      res.status(201).json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Username already exists" }); }
  });
};
