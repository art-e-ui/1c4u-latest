import fs from "fs";

const content = fs.readFileSync("./server.ts", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("app.get(") || line.includes("app.post(") || line.includes("app.put(") || line.includes("app.delete(") || line.includes("app.use(")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
