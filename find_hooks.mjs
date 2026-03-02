import fs from "fs";
import path from "path";

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === "node_modules" || file === ".next") continue;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else if (
      file.endsWith(".tsx") ||
      file.endsWith(".jsx") ||
      file.endsWith(".ts")
    ) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk("src");
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  let hasReturn = false;
  let returnLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line.includes("export default function") ||
      line.includes("export function") ||
      (line.includes("const ") && line.includes("=> {"))
    ) {
      hasReturn = false;
    }
    if (
      (line.startsWith("return ") ||
        (line.startsWith("if (") && line.includes("return"))) &&
      !line.includes("return <")
    ) {
      hasReturn = true;
      returnLine = i + 1;
    }
    if (line.startsWith("}")) {
      hasReturn = false;
    }
    if (line.match(/\buse[A-Z]\w*\(/)) {
      if (hasReturn && !line.includes("return ") && !line.includes("//")) {
        console.log(
          `Potential issue in ${file}:${i + 1} : ${line} (after return at ${returnLine})`,
        );
      }
    }
  }
}
