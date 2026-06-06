async function test() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTl2_YTtSlSt0rnFl1IrnhtOEcnNjyst6yTbNAGYXxJqKTSFmML3mWOy4Q6nZq4qdcWGiUNT5QEI-wP/pub?output=csv';
  const res = await fetch(url);
  console.log('Status:', res.status);
  console.log('Content-Type:', res.headers.get('content-type'));
  const text = await res.text();
  console.log('Text (first 200 chars):', text.substring(0, 200));
}

test();
