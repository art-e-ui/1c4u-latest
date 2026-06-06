import fs from "fs";
import path from "path";

function search(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist") {
        search(fullPath);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".jsx") || file.endsWith(".json")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      
      // Let's search for "saving" (case-insensitive) or "signUp" or "saving new user"
      const lower = content.toLowerCase();
      if (lower.includes("saving") || lower.includes("sign up") || lower.includes("signup") || lower.includes("database error") || lower.includes("satabse")) {
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          const lLower = line.toLowerCase();
          if (lLower.includes("saving") || lLower.includes("sign up") || lLower.includes("signup") || lLower.includes("database") || lLower.includes("error") || lLower.includes("failed")) {
            if (lLower.includes("user") || lLower.includes("profile") || lLower.includes("save") || lLower.includes("auth")) {
              console.log(`${fullPath}:${index + 1}: ${line.trim()}`);
            }
          }
        });
      }
    }
  }
}

search(".");
