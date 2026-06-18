'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');
const { confluenceRequest } = require('./utils/confluence_api');

const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_TOKEN;
const AUTH_HEADER = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;
const BASE_URL = 'https://neobiotech.atlassian.net';
const AA_SPACE_KEY = 'AA';

async function removeLabelFromPage(pageId, labelName) {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}/wiki/rest/api/content/${pageId}/label/${encodeURIComponent(labelName)}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'DELETE',
      headers: { 'Authorization': AUTH_HEADER },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(res.statusCode);
      });
    });

    req.on('error', (err) => {
      console.error(`Error: ${err.message}`);
      resolve(500);
    });
    req.end();
  });
}

async function run() {
  console.log('🗑️ AA 스페이스 전체 페이지에서 is-folder 레이블 일괄 제거 시작...');
  const spaces = await confluenceRequest('GET', `/wiki/api/v2/spaces?keys=${AA_SPACE_KEY}`);
  if (!spaces.results || spaces.results.length === 0) return console.log('AA 스페이스를 찾을 수 없습니다.');
  
  const spaceId = spaces.results[0].id;
  
  // 모든 페이지 조회 (폴더든, 최근 복사된 문서든 싹 다 조회)
  const pages = await confluenceRequest('GET', `/wiki/api/v2/spaces/${spaceId}/pages?limit=200`);
  const pageList = pages.results || [];

  console.log(`총 ${pageList.length}개의 페이지를 검사합니다.`);
  
  let successCount = 0;
  for (const page of pageList) {
    const status = await removeLabelFromPage(page.id, 'is-folder');
    // 204 No Content: 성공적으로 삭제됨
    // 404 Not Found: 애초에 레이블이 없음
    if (status >= 200 && status < 300) {
      console.log(`- [${page.title}] is-folder 레이블 제거 성공`);
      successCount++;
    } else if (status === 404) {
      // 레이블이 없는 경우 조용히 넘어감
    } else {
      console.log(`- [${page.title}] is-folder 제거 실패 (HTTP ${status})`);
    }
  }

  console.log(`\n✅ 완료: 총 ${successCount}개의 문서에서 레이블을 성공적으로 제거했습니다.`);
}

run();
