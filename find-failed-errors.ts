import fs from "fs";
import path from "path";

function searchDir(dir: string) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist") {
        searchDir(filePath);
      }
    } else {
      if (filePath.endsWith(".ts") || filePath.endsWith(".tsx") || filePath.endsWith(".js") || filePath.endsWith(".tsx")) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lower = content.toLowerCase();
        if (
          lower.includes("saving new user") || 
          lower.includes("saving") ||
          lower.includes("signed up") ||
          lower.includes("signup") ||
          lower.includes("auth") ||
          lower.includes("failed")
        ) {
          const lines = content.split("\n");
          lines.forEach((line, index) => {
            const lineLower = line.toLowerCase();
            if (
              lineLower.includes("saving list") || // ignore common noise
              lineLower.includes("saving...") // ignore button labels
            ) return;
            
            if (
              lineLower.includes("saving new user") ||
              lineLower.includes("signed up") ||
              lineLower.includes("save") ||
              lineLower.includes("auth") ||
              lineLower.includes("failed") ||
              lineLower.includes("error")
            ) {
              // Only print lines that look like error messages or user creation
              if (lineLower.includes("error") || lineLower.includes("failed") || lineLower.includes("save") || lineLower.includes("create")) {
                console.log(`${filePath}:${index + 1}: ${line.trim()}`);
              }
            }
          });
        }
      }
    }
  });
}

searchDir("./src");
if (fs.existsSync("./server.ts")) {
  const content = fs.readFileSync("./server.ts", "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    const lineLower = line.toLowerCase();
    if (lineLower.includes("save") || lineLower.includes("user") || lineLower.includes("auth") || lineLower.includes("error") || lineLower.includes("failed")) {
      if (lineLower.includes("register") || lineLower.includes("signup") || lineLower.includes("saving") || lineLower.includes("failed") || lineLower.includes("error") || lineLower.includes("create")) {
        console.log(`./server.ts:${index + 1}: ${line.trim()}`);
      }
    }
  });
}
