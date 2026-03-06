import fs from "fs";
import path from "path";

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else if (
      fullPath.endsWith(".tsx") ||
      fullPath.endsWith(".ts") ||
      fullPath.endsWith(".jsx")
    ) {
      callback(fullPath);
    }
  }
}

const hookRegex = /\buse[A-Z]\w*\s*\(/;
let violations = [];

walkDir("src", (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let currentFuncName = null;
  let currentFuncIsLowercase = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const funcMatch =
      /(?:const|let|var)\s+([a-zA-Z]\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)\s*=>|function\s+([a-zA-Z]\w*)\s*\(/.exec(
        line,
      );
    if (funcMatch) {
      const name = funcMatch[1] || funcMatch[2];
      currentFuncName = name;
      if (/^[a-z]/.test(name) && !name.startsWith("use")) {
        currentFuncIsLowercase = true;
      } else {
        currentFuncIsLowercase = false;
      }
    }

    if (currentFuncIsLowercase && line.match(hookRegex)) {
      if (!line.includes("eslint-disable")) {
        violations.push(
          `${filePath}:${i + 1} | Func: ${currentFuncName} | Line: ${line.trim()}`,
        );
      }
    }
  }
});

fs.writeFileSync("violations_utf8.txt", violations.join("\n"), "utf8");
console.log(`Saved ${violations.length} violations to violations_utf8.txt`);
