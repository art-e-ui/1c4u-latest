import fs from "fs";

const content = fs.readFileSync("./src/pages/admin/ARSTrackOrdersPage.tsx", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.toLowerCase().includes("completed")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
