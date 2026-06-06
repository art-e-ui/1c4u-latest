import fs from 'fs';

async function test() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/products?key=${config.apiKey}`;
  
  try {
    console.log("Fetching", url);
    const res = await fetch(url);
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
    process.exit(0);
  } catch(e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
test();
