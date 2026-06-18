'use strict';
require('dotenv').config();
const https = require('https');

const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_TOKEN;
const AUTH_HEADER = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;
const BASE_URL = 'https://neobiotech.atlassian.net';
const pageId = '434339847'; // MPS 이력

const options = {
  hostname: 'neobiotech.atlassian.net',
  path: `/wiki/rest/api/content/${pageId}/label`,
  method: 'GET',
  headers: {
    'Authorization': AUTH_HEADER,
    'Accept': 'application/json',
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
});
req.end();
