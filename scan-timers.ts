import fs from "fs";

const content = fs.readFileSync("./server.ts", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.includes("setInterval") || line.includes("setTimeout") || line.includes("cron") || line.includes("schedule")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
