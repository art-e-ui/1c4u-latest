import fs from 'fs';

async function test() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/global-cart-prod-us/documents/products?key=${config.apiKey}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
