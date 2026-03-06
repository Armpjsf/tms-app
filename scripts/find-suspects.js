const fs = require("fs");
const path = require("path");
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes("node_modules") && !file.includes(".next")) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk("C:\\Users\\Armdd\\TMS_ePOD\\src");
let out = [];

files.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("use client")) {
    const lines = content.split("\n");
    let returnSeen = false;
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes("export function") ||
        lines[i].includes("export default")
      ) {
        returnSeen = false; // Reset per function
      }

      // If we see a return statement, flag it
      if (
        lines[i].match(/^\s*if\s*\(.*return\s+/) ||
        lines[i].match(/^\s*return\s+/)
      ) {
        returnSeen = true;
      }

      // If we see a hook AFTER a return statement in the same function scope
      if (returnSeen && lines[i].match(/^\s*const\s+.*\s*=\s*use[A-Z]/)) {
        out.push("SUSPECT: " + file + " Line: " + (i + 1));
      }
    }
  }
});

fs.writeFileSync("suspect-hooks.txt", out.join("\n"));
