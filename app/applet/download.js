const fs = require("fs");
const { execSync } = require('child_process');

async function run() {
  console.log("Fetching zip...");
  const res = await fetch("https://github.com/art-e-ui/1c4u-update/archive/refs/heads/main.zip");
  if (!res.ok) throw new Error("fetch failed");
  const buffer = await res.arrayBuffer();
  fs.writeFileSync("repo.zip", Buffer.from(buffer));
  console.log("Downloaded. Extracting...");
  execSync("npx -y unzip-crx-cli repo.zip -d .git-repo");
  console.log("Extracted!");
  
  // copy files
  execSync("cp -R .git-repo/1c4u-update-main/* ./");
  console.log("Copied!");
}
run().catch(console.error);
