import fs from "fs";

const content = fs.readFileSync("./src/pages/admin/VirtualOrderServicesPage.tsx", "utf-8");
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.toLowerCase().includes("status") || line.toLowerCase().includes("complete") || line.toLowerCase().includes("update")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
