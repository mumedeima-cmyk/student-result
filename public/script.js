const $ = id => document.getElementById(id);
const J = { "Content-Type": "application/json" };
let subjects = [];
let allStudents = [];

const traits = ["Punctuality","Responsibility","Diligence","Self-Control","Neatness","Honesty","Attendance","Initiative","Ability","Attentiveness","Co-operation","Curiosity","Creativity","Perseverance"];
const motor = ["Legibility","Dexterity","Handling of Tools","Accuracy","Sport & Games","Physical/Painting","Drawing/Painting"];

function gradeOf(t) {
  return t >= 70 ? "A" : t >= 60 ? "B" : t >= 50 ? "C" : t >= 45 ? "D" : t >= 40 ? "E" : "F";
}
function remark(t) {
  return t >= 70 ? "Excellent" : t >= 60 ? "Very Good" : t >= 50 ? "Good" : t >= 45 ? "Fair" : t >= 40 ? "Pass" : "Fail";
}
function grid(list, title) {
  return `<table class="g"><tr><th>${title}</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th></tr>` +
    list.map((t, i) => `<tr><td>${i + 1}. ${t}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join("") +
    `</table>`;
}

async function loadSubjects(section) {
  subjects = await (await fetch("/api/section-subjects/" + section)).json();
  $("subjects").innerHTML = `<p style="font-size:13px">Senior secondary: leave blank the subjects the student does not take.</p>` +
    `<table class="in"><tr><th>Subject</th><th>1st /20</th><th>2nd /20</th><th>Exam /60</th></tr>` +
    subjects.map(s => `<tr><td>${s.name}</td>
      <td><input type="number" id="t1-${s.id}" min="0" max="20"></td>
      <td><input type="number" id="t2-${s.id}" min="0" max="20"></td>
      <td><input type="number" id="ex-${s.id}" min="0" max="60"></td></tr>`).join("") + `</table>`;
}

async function loadStudents(keepClass, keepId) {
  allStudents = await (await fetch("/api/students")).json();
  const classes = [...new Set(allStudents.map(s => s.class_name))].sort();
  $("classPick").innerHTML = `<option value="">-- New class / new student --</option>` +
    classes.map(c => `<option>${c}</option>`).join("");
  if (keepClass) $("classPick").value = keepClass;
  fillStudents(keepId);
}

function fillStudents(keepId) {
  const c = $("classPick").value;
  const list = allStudents.filter(s => s.class_name === c);
  $("studentPick").innerHTML = `<option value="">-- New student --</option>` +
    list.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  if (keepId) $("studentPick").value = keepId;
}

function clearForm() {
  ["studentName", "admissionNumber", "age", "house"].forEach(i => $(i).value = "");
  subjects.forEach(s => { $("t1-" + s.id).value = ""; $("t2-" + s.id).value = ""; $("ex-" + s.id).value = ""; });
  $("result").innerHTML = "";
}

$("section").addEventListener("change", () => loadSubjects($("section").value));

$("classPick").addEventListener("change", () => {
  fillStudents();
  clearForm();
  $("className").value = $("classPick").value;
});

$("studentPick").addEventListener("change", async () => {
  const id = $("studentPick").value;
  clearForm();
  if (!id) { $("className").value = $("classPick").value; return; }
  const st = allStudents.find(s => String(s.id) === id);
  $("studentName").value = st.name;
  $("admissionNumber").value = st.admission_number;
  $("className").value = st.class_name;
  if (st.gender) $("sex").value = st.gender;
  $("section").value = st.section || "junior";
  await loadSubjects($("section").value);
  const rep = await (await fetch("/api/report/" + id)).json();
  rep.subjects.forEach(r => {
    const s = subjects.find(x => x.name === r.subject);
    if (!s) return;
    $("t1-" + s.id).value = Number(r.test1_score);
    $("t2-" + s.id).value = Number(r.test2_score);
    $("ex-" + s.id).value = Number(r.exam_score);
  });
});

$("resultForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = $("result");
  out.textContent = "Saving...";
  try {
    const section = $("section").value;
    const entries = [];
    for (const s of subjects) {
      const a = $("t1-" + s.id).value, b = $("t2-" + s.id).value, c = $("ex-" + s.id).value;
      const n = [a, b, c].filter(v => v !== "").length;
      if (n === 3) entries.push({ s, a: Number(a), b: Number(b), c: Number(c) });
      else if (n > 0) throw new Error("Complete all three marks for " + s.name);
      else if (section !== "senior") throw new Error("Please fill in " + s.name);
    }
    if (!entries.length) throw new Error("Enter marks for at least one subject");

    const sr = await fetch("/api/student-save", { method: "POST", headers: J, body: JSON.stringify({
      admission_number: $("admissionNumber").value.trim(), name: $("studentName").value.trim(),
      gender: $("sex").value, class_name: $("className").value.trim(), section }) });
    if (!sr.ok) throw new Error((await sr.json()).error);
    const st = await sr.json();

    for (const x of entries) {
      const r = await fetch("/api/marks", { method: "POST", headers: J, body: JSON.stringify({
        student_id: st.id, subject_id: x.s.id, test1_score: x.a, test2_score: x.b, exam_score: x.c }) });
      if (!r.ok) throw new Error((await r.json()).error);
    }
    const rep = await (await fetch("/api/report/" + st.id)).json();
    const total = rep.subjects.reduce((a, r) => a + Number(r.total), 0);
    const avg = total / rep.subjects.length;
    out.innerHTML = cardHTML(st, rep, total, avg);
    loadStudents(st.class_name, st.id);
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
});

(async () => {
  const r = await fetch("/api/me");
  if (!r.ok) { location.href = "/login.html"; return; }
  const me = await r.json();
  if (me.role === "parent") { location.href = "/parent.html"; return; }
  $("who").textContent = "Logged in as " + me.username;
  if (me.role === "admin") $("adminBox").style.display = "block";
})();
$("logoutBtn").onclick = async () => { await fetch("/api/logout", { method: "POST" }); location.href = "/login.html"; };
$("addTeacherBtn").onclick = async () => {
  const r = await fetch("/api/users", { method: "POST", headers: J,
    body: JSON.stringify({ username: $("newUser").value, password: $("newPass").value }) });
  const d = await r.json();
  $("teacherMsg").textContent = r.ok ? "Teacher added" : d.error;
  if (r.ok) { $("newUser").value = ""; $("newPass").value = ""; }
};
$("addParentBtn").onclick = async () => {
  const r = await fetch("/api/parents", { method: "POST", headers: J,
    body: JSON.stringify({ username: $("pUser").value, password: $("pPass").value, admissions: $("pAdm").value }) });
  const d = await r.json();
  $("parentMsg").textContent = r.ok ? "Parent added" : d.error;
  if (r.ok) { $("pUser").value = ""; $("pPass").value = ""; $("pAdm").value = ""; }
};
$("newPass").insertAdjacentHTML("afterend",
  '<label style="font-size:13px"><input type="checkbox" id="showNew" style="width:auto"> Show password</label>');
$("showNew").onchange = () => { $("newPass").type = $("showNew").checked ? "text" : "password"; };

loadSubjects($("section").value).then(() => loadStudents());
