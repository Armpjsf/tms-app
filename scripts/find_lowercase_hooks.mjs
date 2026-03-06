import fs from "fs";
import path from "path";

// A simple regex approach to find potential violations:
// We look for function declarations/expressions that are lowercase, and check if they contain 'use' hooks.

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

const hookRegex = /\buse[A-Z]\w*\s*\(/g;
const lowercaseFuncRegex =
  /(?:const|let|var)\s+([a-z]\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)\s*=>|function\s+([a-z]\w*)\s*\(/g;

let violations = [];

walkDir("src", (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");

  // We'll just do a very crude check: does the file have a lowercase function definition and a hook call?
  // If so, we'll print it out for manual inspection.
  const lines = content.split("\n");
  let currentFuncName = null;
  let currentFuncIsLowercase = false;
  let scopeDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track basic curly brace scope just to guess when we are inside a function
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // If we are at depth 1 (inside a React component) and define another function
    const funcMatch =
      /(?:const|let|var)\s+([a-zA-Z]\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)\s*=>|function\s+([a-zA-Z]\w*)\s*\(/.exec(
        line,
      );
    if (funcMatch) {
      const name = funcMatch[1] || funcMatch[2];
      currentFuncName = name;
      // Check if name is lowercase and not starting with 'use'
      if (/^[a-z]/.test(name) && !name.startsWith("use")) {
        currentFuncIsLowercase = true;
      } else {
        currentFuncIsLowercase = false;
      }
    }

    if (currentFuncIsLowercase && line.match(hookRegex)) {
      // EXCLUDE common valid uses like outside components
      if (!line.includes("eslint-disable")) {
        console.log(`Potential violation in ${filePath}:${i + 1}`);
        console.log(`  Function: ${currentFuncName}`);
        console.log(`  Line: ${line.trim()}`);
        violations.push({ file: filePath, line: i + 1, func: currentFuncName });
      }
    }
  }
});

console.log(`Found ${violations.length} potential violations.`);
