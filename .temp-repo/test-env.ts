import fs from 'fs';
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  console.log('Service Account Project ID:', creds.project_id);
}
