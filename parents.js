const bcrypt = require("bcryptjs");
module.exports = function (app, pool) {
  app.get("/api/my-children", async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT s.id, s.name, s.admission_number, s.class_name FROM students s
         JOIN parent_students ps ON ps.student_id = s.id WHERE ps.parent_id = $1 ORDER BY s.name`, [req.user.id]);
      res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Could not load children" }); }
  });

  app.post("/api/parents", async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
    const { username, password, admissions } = req.body || {};
    const list = [...new Set(String(admissions || "").split(",").map(a => a.trim()).filter(Boolean))];
    if (!username || !password || password.length < 6 || !list.length)
      return res.status(400).json({ error: "Username, 6+ character password and admission number(s) needed" });
    try {
      const st = await pool.query("SELECT id, admission_number FROM students WHERE admission_number = ANY($1)", [list]);
      if (st.rowCount !== list.length) {
        const found = st.rows.map(s => s.admission_number);
        return res.status(400).json({ error: "Not found: " + list.filter(a => !found.includes(a)).join(", ") });
      }
      const h = await bcrypt.hash(password, 10);
      const u = await pool.query("INSERT INTO users (username, password_hash, role) VALUES ($1,$2,'parent') RETURNING id", [username.trim(), h]);
      for (const s of st.rows)
        await pool.query("INSERT INTO parent_students (parent_id, student_id) VALUES ($1,$2)", [u.rows[0].id, s.id]);
      res.status(201).json({ ok: true });
    } catch (e) { res.status(400).json({ error: "Username already exists" }); }
  });
};
