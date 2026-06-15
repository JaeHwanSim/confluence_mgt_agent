/**
 * clean_aa_space.js
 *
 * AA 스페이스에서 이전에 이관된 페이지들을 삭제합니다.
 * - migration_log.json에 기록된 페이지만 삭제합니다.
 * - 섹션 인덱스 페이지(MPS 이력, 프로젝트 현황 등 setup_aa_space.js로 생성된 페이지)는 유지합니다.
 * - 재이관 전 클린 슬레이트를 만드는 용도로 사용합니다.
 *
 * 실행:
 *   node scripts/clean_aa_space.js --dry-run   # 삭제 예정 목록만 출력
 *   node scripts/clean_aa_space.js              # 실제 삭제
 *
 * 필수 환경변수 (.env):
 *   CONFLUENCE_EMAIL=your@email.com
 *   CONFLUENCE_TOKEN=your_api_token
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── 설정 ─────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://neobiotech.atlassian.net';
const DRY_RUN = process.argv.includes('--dry-run');

const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_TOKEN;

if (!DRY_RUN && (!EMAIL || !TOKEN)) {
  console.error('오류: .env 파일에 CONFLUENCE_EMAIL, CONFLUENCE_TOKEN을 설정하세요.');
  process.exit(1);
}

const AUTH_HEADER = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;
const MIGRATION_LOG_PATH = path.join(__dirname, '..', 'reference', 'migration_log.json');
const API_DELAY_MS = 400;

// ─── API 클라이언트 ───────────────────────────────────────────────────────────

function apiRequest(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        Authorization: AUTH_HEADER,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(data ? JSON.parse(data) : {}); }
          catch (e) { resolve({}); }
        } else if (res.statusCode === 404) {
          // 이미 삭제된 경우 무시
          resolve(null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 삭제 서비스 ──────────────────────────────────────────────────────────────

/**
 * Confluence 페이지를 영구 삭제합니다 (휴지통 포함).
 * @param {string} pageId
 */
async function deletePage(pageId) {
  // 1차: 페이지 삭제 (휴지통으로 이동)
  await apiRequest('DELETE', `${BASE_URL}/wiki/api/v2/pages/${pageId}`);
  // 2차: 휴지통에서도 영구 삭제 (선택적 - 없으면 무시)
  try {
    await apiRequest('DELETE', `${BASE_URL}/wiki/rest/api/content/${pageId}?status=trashed`);
  } catch (_) {
    // 무시
  }
}

// ─── 메인 실행 ────────────────────────────────────────────────────────────────

async function main() {
  console.log('========================================');
  console.log('  AA 스페이스 이관 페이지 정리 스크립트');
  console.log('========================================');
  console.log(`모드: ${DRY_RUN ? '🔍 DRY-RUN (실제 삭제 없음)' : '🗑️  실제 삭제'}`);
  console.log('');

  // ── 이관 로그 로드 ──────────────────────────────────────────────────────────
  if (!fs.existsSync(MIGRATION_LOG_PATH)) {
    console.log('migration_log.json이 없습니다. 정리할 내용이 없습니다.');
    return;
  }

  const logData = JSON.parse(fs.readFileSync(MIGRATION_LOG_PATH, 'utf8'));
  const allEntries = logData.log || [];
  const toDelete = allEntries.filter(e => !e.failed && e.newPageId);

  console.log(`migration_log.json 총 항목: ${allEntries.length}개`);
  console.log(`삭제 대상 (성공 이관된 페이지): ${toDelete.length}개`);
  console.log(`실패 항목 (스킵): ${allEntries.length - toDelete.length}개\n`);

  if (toDelete.length === 0) {
    console.log('✅ 삭제할 페이지가 없습니다.');
    return;
  }

  if (DRY_RUN) {
    console.log('[DRY-RUN] 삭제 예정 목록:');
    toDelete.forEach((entry, i) => {
      console.log(`  ${i + 1}. "${entry.sourcePageTitle}"`);
      console.log(`     AA 페이지 ID: ${entry.newPageId}`);
      console.log(`     AA 페이지 URL: ${entry.newPageUrl}`);
    });
    console.log(`\nDRY-RUN 완료. 총 ${toDelete.length}개 페이지가 삭제될 예정입니다.`);
    return;
  }

  // ── 실제 삭제 ─────────────────────────────────────────────────────────────
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toDelete.length; i++) {
    const entry = toDelete[i];
    const progress = `[${i + 1}/${toDelete.length}]`;
    process.stdout.write(`${progress} 삭제 중: "${entry.sourcePageTitle}"... `);

    try {
      await deletePage(entry.newPageId);
      successCount++;
      console.log('✅ 완료');
    } catch (err) {
      failCount++;
      console.log(`❌ 실패: ${err.message}`);
    }

    if (i < toDelete.length - 1) await sleep(API_DELAY_MS);
  }

  // ── 로그 초기화 ───────────────────────────────────────────────────────────
  fs.writeFileSync(MIGRATION_LOG_PATH, JSON.stringify({
    lastRun: new Date().toISOString(),
    totalMigrated: 0,
    log: [],
    _cleanedAt: new Date().toISOString(),
    _previousCount: toDelete.length,
  }, null, 2));

  console.log('\n========================================');
  console.log('  정리 완료 요약');
  console.log('========================================');
  console.log(`  성공 삭제: ${successCount}개`);
  console.log(`  실패: ${failCount}개`);
  console.log(`  migration_log.json 초기화 완료`);
  console.log('\n이제 npm run migrate:all 로 재이관을 시작하세요.');
}

main().catch(err => {
  console.error('\n치명적 오류:', err.message);
  process.exit(1);
});
