require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

function calculateGrade(total) {
    if (total >= 70) return "A";
    if (total >= 60) return "B";
    if (total >= 50) return "C";
    if (total >= 45) return "D";
    if (total >= 40) return "E";
    return "F";
}

// Get all students
app.get("/api/students", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM students ORDER BY name"
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Unable to retrieve students" });
    }
});

// Add student
app.post("/api/students", async (req, res) => {
    const {
        admission_number,
        name,
        gender,
        class_name,
        arm
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO students
            (admission_number, name, gender, class_name, arm)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                admission_number,
                name,
                gender,
                class_name,
                arm
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        res.status(400).json({
            error: "Could not create student"
        });
    }
});

// Add/update score
app.post("/api/scores", async (req, res) => {
    const {
        student_id,
        subject_id,
        ca_score,
        exam_score
    } = req.body;

    if (
        ca_score < 0 ||
        ca_score > 40 ||
        exam_score < 0 ||
        exam_score > 60
    ) {
        return res.status(400).json({
            error: "CA must be 0-40 and examination must be 0-60"
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO scores
            (student_id, subject_id, ca_score, exam_score)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (student_id, subject_id)
            DO UPDATE SET
                ca_score = EXCLUDED.ca_score,
                exam_score = EXCLUDED.exam_score
            RETURNING *`,
            [
                student_id,
                subject_id,
                ca_score,
                exam_score
            ]
        );

        res.json(result.rows[0]);

    } catch (error) {
        res.status(500).json({
            error: "Could not save score"
        });
    }
});

// Get a student's complete result
app.get("/api/results/:studentId", async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                students.name,
                students.admission_number,
                students.class_name,
                subjects.name AS subject,
                scores.ca_score,
                scores.exam_score,
                (scores.ca_score + scores.exam_score) AS total
             FROM scores
             JOIN students
                ON scores.student_id = students.id
             JOIN subjects
                ON scores.subject_id = subjects.id
             WHERE students.id = $1
             ORDER BY subjects.name`,
            [req.params.studentId]
        );

        const rows = result.rows.map(row => ({
            ...row,
            grade: calculateGrade(Number(row.total))
        }));

        res.json(rows);

    } catch (error) {
        res.status(500).json({
            error: "Unable to retrieve result"
        });
    }
});

app.get("/api/subjects", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM subjects ORDER BY id");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Unable to retrieve subjects" });
    }
});
app.listen(process.env.PORT || 3000, () => {
    console.log("School Result System running on port 3000");
});

app.post("/api/marks", async (req, res) => {
    const { student_id, subject_id, test1_score, test2_score, exam_score } = req.body;
    if (test1_score < 0 || test1_score > 20 || test2_score < 0 || test2_score > 20 || exam_score < 0 || exam_score > 60) {
        return res.status(400).json({ error: "Tests are 0-20 each, exam is 0-60" });
    }
    try {
        await pool.query(
            `INSERT INTO scores (student_id, subject_id, ca_score, test1_score, test2_score, exam_score)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (student_id, subject_id) DO UPDATE SET
               ca_score = EXCLUDED.ca_score, test1_score = EXCLUDED.test1_score,
               test2_score = EXCLUDED.test2_score, exam_score = EXCLUDED.exam_score`,
            [student_id, subject_id, test1_score + test2_score, test1_score, test2_score, exam_score]
        );
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "Could not save marks" });
    }
});

app.get("/api/report/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
        const subs = await pool.query(
            `SELECT sub.name AS subject, sc.student_id, sc.test1_score, sc.test2_score, sc.exam_score,
                    (sc.ca_score + sc.exam_score) AS total,
                    RANK() OVER (PARTITION BY sc.subject_id ORDER BY (sc.ca_score + sc.exam_score) DESC) AS pos
             FROM scores sc
             JOIN students st ON st.id = sc.student_id
             JOIN subjects sub ON sub.id = sc.subject_id
             WHERE st.class_name = (SELECT class_name FROM students WHERE id = $1)
             ORDER BY sub.id`, [id]);
        const overall = await pool.query(
            `SELECT sc.student_id,
                    RANK() OVER (ORDER BY SUM(sc.ca_score + sc.exam_score) DESC) AS pos
             FROM scores sc JOIN students st ON st.id = sc.student_id
             WHERE st.class_name = (SELECT class_name FROM students WHERE id = $1)
             GROUP BY sc.student_id`, [id]);
        const me = overall.rows.find(r => r.student_id === id);
        res.json({
            subjects: subs.rows.filter(r => r.student_id === id),
            position: me ? Number(me.pos) : null,
            classSize: overall.rows.length
        });
    } catch (e) {
        res.status(500).json({ error: "Unable to build report" });
    }
});
