const fs = require("fs");
let s = fs.readFileSync("public/script.js", "utf8");
const bad = [];
function sub(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { bad.push(a.slice(0, 50) + " (found " + n + ")"); return; }
  s = s.replace(a, () => b);
}
sub("let allStudents = [];", "let allStudents = [];\nlet hadMarks = new Set();");
sub("function clearForm() {", "function clearForm() {\n  hadMarks = new Set();");
sub("if (!s) return;", "if (!s) return;\n    hadMarks.add(s.id);");
sub("const entries = [];", "const entries = [];\n    const blanks = [];");
sub('if ([a, b, c].some(v => v !== "")) entries.push(', 'if ([a, b, c].every(v => v === "")) blanks.push(s); else entries.push(');
sub('const sr = await fetch("/api/student-save"',
  'const removing = blanks.filter(x => hadMarks.has(x.id));\n    if (removing.length && !confirm("Remove the saved marks for: " + removing.map(x => x.name).join(", ") + "?")) throw new Error("Cancelled");\n    const sr = await fetch("/api/student-save"');
sub('const rep = await (await fetch("/api/report/" + st.id)).json();',
  'for (const x of removing) await fetch("/api/marks/" + st.id + "/" + x.id, { method: "DELETE" });\n    hadMarks = new Set(entries.map(x => x.s.id));\n    const rep = await (await fetch("/api/report/" + st.id)).json();');
if (bad.length) { console.log("Not patched. Problems:\n" + bad.join("\n")); process.exit(1); }
fs.writeFileSync("public/script.js", s);
console.log("patched");
