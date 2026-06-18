'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { confluenceRequest } = require('./utils/confluence_api');
const https = require('https');

const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_TOKEN;
const AUTH_HEADER = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;
const BASE_URL = 'https://neobiotech.atlassian.net';
const AA_SPACE_KEY = 'AA';

async function addLabelToPage(pageId, label) {
  const payload = [{ prefix: 'global', name: label }];
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/wiki/rest/api/content/${pageId}/label`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': AUTH_HEADER,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function fixLabels() {
  console.log('🔧 AA 스페이스의 모든 컨테이너 페이지에 is-folder 강제 부착 시작...');
  const spaces = await confluenceRequest('GET', `/wiki/api/v2/spaces?keys=${AA_SPACE_KEY}`);
  if (!spaces.results || spaces.results.length === 0) return;
  const spaceId = spaces.results[0].id;

  const pages = await confluenceRequest('GET', `/wiki/api/v2/spaces/${spaceId}/pages?limit=200`);
  const pageList = pages.results || [];
  
  for (const page of pageList) {
    const status = await addLabelToPage(page.id, 'is-folder');
    console.log(`- [${page.title}] 에 is-folder 부착 시도 -> HTTP ${status}`);
  }
  console.log('✅ 모든 컨테이너 레이블 작업 완료!');
}

fixLabels();
