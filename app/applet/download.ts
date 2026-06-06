import fs from "fs";
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { extract } from 'tar'; // wait, for tar?
// Unzipping usually needs 'unzipper'. I can install it or use admire-zip.
import { execSync } from 'child_process';

async function run() {
  console.log("Fetching zip...");
  const res = await fetch("https://github.com/art-e-ui/1c4u-update/archive/refs/heads/main.zip");
  if (!res.ok) throw new Error("fetch failed");
  const dest = fs.createWriteStream("repo.zip");
  // @ts-expect-error - res.body matches ReadableStream from node-fetch but types can slightly differ
  await finished(Readable.fromWeb(res.body).pipe(dest));
  console.log("Downloaded. Extracting...");
  execSync("npx -y unzip-cli repo.zip -d .git-repo");
  console.log("Done");
}
run().catch(console.error);
