'use strict';
require('dotenv').config();
const { confluenceRequest } = require('../scripts/utils/confluence_api');
const { fetchPageDetail } = require('../scripts/utils/migration_utils');

// Dify 로그에서 보인 실제 실패 페이지 ID 중 하나로 테스트
const TEST_PAGE_ID = '435519786'; // AI - 12월 월간 MPS

async function test() {
  console.log('=== fetchPageDetail 디버깅 ===');
  const meta = await fetchPageDetail(TEST_PAGE_ID);
  console.log('createdAt raw:', meta.createdAt);
  console.log('createdAt trimmed:', meta.createdAt ? meta.createdAt.substring(0, 10) : '(비어있음)');
  
  // Confluence v1 API로 실제 생성일 조회
  const v1 = await confluenceRequest('GET', `/wiki/rest/api/content/${TEST_PAGE_ID}?expand=history`);
  console.log('v1 history.createdDate:', v1.history?.createdDate);
  console.log('v1 history.lastUpdated.when:', v1.history?.lastUpdated?.when);
}

test().catch(console.error);
