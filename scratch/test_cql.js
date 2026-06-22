require('dotenv').config();
const https = require('https');
const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_TOKEN;
const AUTH_HEADER = 'Basic ' + Buffer.from(EMAIL + ':' + TOKEN).toString('base64');

const query = encodeURIComponent('space="AA" and label="is-folder"');
const url = 'https://neobiotech.atlassian.net/wiki/rest/api/content/search?cql=' + query + '&limit=20';

const req = https.request(url, { method: 'GET', headers: { Authorization: AUTH_HEADER, Accept: 'application/json' } }, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const r = JSON.parse(d);
    console.log('is-folder 레이블 검색 결과:', r.size, '개');
    (r.results || []).forEach(p => console.log(' -', p.title, '(ID:', p.id + ')'));
  });
});
req.on('error', e => console.error(e.message));
req.end();
