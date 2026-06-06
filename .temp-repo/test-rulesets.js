import fs from 'fs';

async function test() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  
  // List rulesets
  const url = `https://firebaserules.googleapis.com/v1/projects/${config.projectId}/rulesets?key=${config.apiKey}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text.substring(0, 1000));
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
