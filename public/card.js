function cardHTML(st, rep, total, avg) {
  const rows = rep.subjects.map(r => `<tr><td>${r.subject}</td><td>${Number(r.test1_score)}</td><td>${Number(r.test2_score)}</td>
    <td>${Number(r.exam_score)}</td><td>${Number(r.total)}</td><td>${r.pos}</td>
    <td>${gradeOf(Number(r.total))}</td><td>${remark(Number(r.total))}</td></tr>`).join("");
  return `
  <button class="noprint" onclick="window.print()">Print / Save as PDF</button>
  <div class="card">
    <h2>NNERO FOUNDATION ACADEMY</h2>
    <p class="c">Nikton Road, Opposite Redeemed Christian Church by Express Kpansia, Yenagoa Bayelsa State.</p>
    <h3 class="c">CONTINUOUS ASSESSMENT REPORT FOR JUNIOR SECONDARY SCHOOL</h3>
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
        <h4>PART B: AFFECTIVE</h4>${grid(traits, "Traits")}
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
        <h4>PART C: PSYCHOMOTOR</h4>${grid(motor, "Skills")}
      </div>
      <div class="ps sbox">
        <p><b>Total Score:</b> ${total}</p>
        <p><b>% Average:</b> ${avg.toFixed(2)}</p>
        <p><b>Grade:</b> ${gradeOf(avg)} (${remark(avg)})</p>
        <p><b>Position:</b> ${rep.position} of ${rep.classSize}</p>
        <p><b>Class Teacher's Remark:</b> ______________________</p>
        <p>______________________________</p>
        <p><b>Proprietress Remark:</b> ______________________</p>
        <p>______________________________</p>
      </div>
    </div></div>
  </div>`;
}
