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

async function loadSubjects() {
  subjects = await (await fetch("/api/subjects")).json();
  $("subjects").innerHTML = `<table class="in"><tr><th>Subject</th><th>1st /20</th><th>2nd /20</th><th>Exam /60</th></tr>` +
    subjects.map(s => `<tr><td>${s.name}</td>
      <td><input type="number" id="t1-${s.id}" min="0" max="20" required></td>
      <td><input type="number" id="t2-${s.id}" min="0" max="20" required></td>
      <td><input type="number" id="ex-${s.id}" min="0" max="60" required></td></tr>`).join("") + `</table>`;
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
    const admission_number = $("admissionNumber").value.trim();
    const all = await (await fetch("/api/students")).json();
    let st = all.find(s => s.admission_number === admission_number);
    if (!st) {
      const r = await fetch("/api/students", { method: "POST", headers: J,
        body: JSON.stringify({ admission_number, name: $("studentName").value.trim(),
          gender: $("sex").value, class_name: $("className").value.trim(), arm: null }) });
      if (!r.ok) throw new Error("Could not create student");
      st = await r.json();
    }
    for (const s of subjects) {
      const r = await fetch("/api/marks", { method: "POST", headers: J, body: JSON.stringify({
        student_id: st.id, subject_id: s.id,
        test1_score: Number($("t1-" + s.id).value),
        test2_score: Number($("t2-" + s.id).value),
        exam_score: Number($("ex-" + s.id).value) }) });
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

loadSubjects().then(() => loadStudents());
(async () => {
  const r = await fetch("/api/me");
  if (!r.ok) { location.href = "/login.html"; return; }
  const me = await r.json();
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
$("newPass").insertAdjacentHTML("afterend",
  '<label style="font-size:13px"><input type="checkbox" id="showNew" style="width:auto"> Show password</label>');
$("showNew").onchange = () => { $("newPass").type = $("showNew").checked ? "text" : "password"; };
