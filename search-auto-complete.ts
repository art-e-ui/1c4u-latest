import fs from "fs";
import path from "path";

function searchDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist") {
        searchDir(fullPath);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes("Date") || content.includes(".now") || content.includes("72") || content.includes("3") || content.includes("24")) {
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          const lower = line.toLowerCase();
          if (lower.includes("completed") || lower.includes("status")) {
            console.log(`${fullPath}:${index + 1} -> ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir(".");
