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
      if (content.includes("orders") || content.includes("order")) {
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if (line.includes("updateDoc") || line.includes("update") || line.includes("set") || line.includes("status")) {
            if (line.toLowerCase().includes("status") || line.toLowerCase().includes("order")) {
              console.log(`${fullPath}:${index + 1} -> ${line.trim()}`);
            }
          }
        });
      }
    }
  }
}

searchDir(".");
