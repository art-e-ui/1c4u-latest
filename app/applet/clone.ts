import { execSync } from "child_process";
import fs from "fs";
try {
  console.log("Cloning...");
  execSync("git clone https://github.com/art-e-ui/1c4u-update.git .git-repo", { stdio: "inherit" });
  console.log("Done");
} catch (e) {
  console.error(e);
}
