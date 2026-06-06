import http from 'http';

http.get({
  host: 'metadata.google.internal',
  path: '/computeMetadata/v1/project/project-id',
  headers: { 'Metadata-Flavor': 'Google' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Metadata Project ID:', data));
}).on('error', (e) => console.error(e));
