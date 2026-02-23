const fs = require("fs");
const res = JSON.parse(fs.readFileSync("eslint-results.json", "utf8"));
const out = [];
res.forEach((f) => {
  f.messages.forEach((m) => {
    if (m.ruleId && m.ruleId.includes("hook")) {
      out.push(f.filePath + ":" + m.line + " " + m.ruleId + " " + m.message);
    }
  });
});
if (out.length === 0) out.push("NO HOOK ERRORS FOUND.");
fs.writeFileSync("hooks-log.txt", out.join("\n"));
