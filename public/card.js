function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

function titleOf(sec) {
  const t = { nursery: "NURSERY SCHOOL", primary: "PRIMARY SCHOOL", junior: "JUNIOR SECONDARY SCHOOL", senior: "SENIOR SECONDARY SCHOOL" };
  return "CONTINUOUS ASSESSMENT REPORT FOR " + (t[sec] || t.junior);
}

function ratingGrid(list, title, set, chosen) {
  chosen = chosen || {};
  return `<table class="g"><tr><th>${title}</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th></tr>` +
    list.map((t, i) => `<tr data-set="${set}" data-name="${t}"><td>${i + 1}. ${t}</td>` +
      [5, 4, 3, 2, 1].map(n => `<td class="rate${chosen[t] === n ? " on" : ""}" data-g="${n}">${chosen[t] === n ? "✓" : ""}</td>`).join("") +
      `</tr>`).join("") + `</table>`;
}

document.addEventListener("click", e => {
  const c = e.target.closest("td.rate");
  if (!c) return;
  const was = c.classList.contains("on");
  c.parentElement.querySelectorAll("td.rate").forEach(x => { x.classList.remove("on"); x.textContent = ""; });
  if (!was) { c.classList.add("on"); c.textContent = "✓"; }
});

function collectExtras() {
  const pick = set => {
    const o = {};
    document.querySelectorAll('tr[data-set="' + set + '"]').forEach(tr => {
      const on = tr.querySelector("td.on");
      if (on) o[tr.dataset.name] = Number(on.dataset.g);
    });
    return o;
  };
  return { affective: pick("aff"), psychomotor: pick("psy"),
    teacher_remark: document.getElementById("tRemark").value,
    proprietress_remark: document.getElementById("pRemark").value };
}

async function saveExtras(id) {
  const msg = document.getElementById("extraMsg");
  msg.textContent = "Saving...";
  try {
    const r = await fetch("/api/extras/" + id, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(collectExtras()) });
    msg.textContent = r.ok ? "Saved" : "Could not save";
  } catch (e) { msg.textContent = "Could not save"; }
}

function cardHTML(st, rep, total, avg, ex) {
  ex = ex || {};
  const rows = rep.subjects.map(r => `<tr><td>${r.subject}</td><td>${Number(r.test1_score)}</td><td>${Number(r.test2_score)}</td>
    <td>${Number(r.exam_score)}</td><td>${Number(r.total)}</td><td>${r.pos}</td>
    <td>${gradeOf(Number(r.total))}</td><td>${remark(Number(r.total))}</td></tr>`).join("");
  return `
  <div class="noprint">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="saveExtras(${st.id})">Save ratings and remarks</button>
    <span id="extraMsg"></span>
  </div>
  <div class="card">
    <h2>NNERO FOUNDATION ACADEMY</h2>
    <p class="c">Nikton Road, Opposite Redeemed Christian Church by Express Kpansia, Yenagoa Bayelsa State.</p>
    <h3 class="c">${titleOf(st.section)}</h3>
    <p><b>Name:</b> ${st.name} &nbsp; <b>House:</b> ${$("house").value}</p>
    <p><b>Admission No:</b> ${st.admission_number} &nbsp; <b>Sex:</b> ${$("sex").value} &nbsp; <b>Age:</b> ${$("age").value}</p>
    <p><b>Class:</b> ${st.class_name} &nbsp; <b>Year:</b> ${$("year").value}</p>
    <p><b>Next Term Begins:</b> ${$("nextBegins").value} &nbsp; <b>Ends:</b> ${$("nextEnds").value}</p>
    <div class="cardwrap"><div class="rc">
      <div class="pa">
        <h4>PART A: COGNITIVE</h4>
        <table class="g"><tr><th>Subject</th><th>1st Test 20</th><th>2nd Test 20</th><th>Exam 60</th><th>Total 100</th><th>Position</th><th>Grade</th><th>Remark</th></tr>${rows}</table>
      </div>
      <div class="pb">
        <h4>PART B: AFFECTIVE</h4>${ratingGrid(traits, "Traits", "aff", ex.affective)}
      </div>
      <div class="pk kbox">
        <p><b><u>KEY TO RATINGS</u></b></p>
        <p>5 Maintains an Excellent Degree of Observable Traits</p>
        <p>4 Maintains a High Level of Observable Traits</p>
        <p>3 Acceptable Level of Observable Traits</p>
        <p>2 Showing Minimal Regards for Observable Traits</p>
        <p>1 Has no Regards for Observable Traits</p>
      </div>
      <div class="pc">
        <h4>PART C: PSYCHOMOTOR</h4>${ratingGrid(motor, "Skills", "psy", ex.psychomotor)}
      </div>
      <div class="ps sbox">
        <p><b>Total Score:</b> ${total}</p>
        <p><b>% Average:</b> ${avg.toFixed(2)}</p>
        <p><b>Grade:</b> ${gradeOf(avg)} (${remark(avg)})</p>
        <p><b>Position:</b> ${rep.position} of ${rep.classSize}</p>
        <p><b>Class Teacher's Remark:</b></p>
        <textarea id="tRemark" class="remark" rows="3">${esc(ex.teacher_remark)}</textarea>
        <p><b>Proprietress Remark:</b></p>
        <textarea id="pRemark" class="remark" rows="3">${esc(ex.proprietress_remark)}</textarea>
      </div>
    </div></div>
  </div>`;
}
