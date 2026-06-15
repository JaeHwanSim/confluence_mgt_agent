/**
 * migrate_to_aa_space.js
 *
 * SD 스페이스의 이관 후보 페이지들을 AA 스페이스로 복사합니다.
 * - 원본 SD 스페이스 페이지는 삭제하지 않습니다 (Copy 방식).
 * - 이관된 페이지 본문 최상단에 원본 메타 정보 배너를 삽입합니다.
 * - 이관 로그를 파일에 저장하여 중복 이관을 방지합니다.
 * - SOLID 원칙 준수 (단일 책임 분리)
 *
 * 실행:
 *   node scripts/migrate_to_aa_space.js --dry-run   # 검증만 (실제 생성 없음)
 *   node scripts/migrate_to_aa_space.js              # 실제 이관
 *   node scripts/migrate_to_aa_space.js --category="MPS 이력"  # 특정 카테고리만
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
const AA_SPACE_KEY = 'AA';
const SD_SPACE_KEY = 'SD';
const DRY_RUN = process.argv.includes('--dry-run');
const CATEGORY_FILTER = (() => {
  const arg = process.argv.find(a => a.startsWith('--category='));
  return arg ? arg.split('=').slice(1).join('=') : null;
})();

const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_TOKEN;

if (!DRY_RUN && (!EMAIL || !TOKEN)) {
  console.error('오류: .env 파일에 CONFLUENCE_EMAIL, CONFLUENCE_TOKEN을 설정하세요.');
  process.exit(1);
}

const AUTH_HEADER = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;

// 이관 로그 파일 (중복 방지용)
const MIGRATION_LOG_PATH = path.join(__dirname, '..', 'reference', 'migration_log.json');

// API 호출 사이 딜레이 (ms) - Rate Limit 방지
const API_DELAY_MS = 700;

// SD → AA 카테고리-서브카테고리 → AA 부모 페이지 매핑
// AA 스페이스의 섹션 페이지 제목과 일치해야 합니다.
// MPS 이력은 연도+과제별 하위 섹션으로 매핑
const CATEGORY_TO_AA_PARENT = {
  'MPS 이력': {
    '연간 MPS': '연간 MPS',
    '2025년 월간·주간': '2025년 월간·주간',
    '2026년 월간·주간': '2026년 월간·주간',
    '2024년 월간·주간': '2025년 월간·주간',  // 2024년은 2025 폴더에 포함
  },
  '프로젝트 현황': {
    '정부과제': '정부과제',
    'AI 프로젝트': 'AI 프로젝트',
    'SW 프로젝트': 'SW 프로젝트',
    'Device 프로젝트': 'Device 프로젝트',
  },
  '기술 조사 & 인사이트': {
    'AI·ML 기술': 'AI·ML 기술',
    '제품·시장 조사': '제품·시장 조사',
    '기술 표준 & 아키텍처': '기술 표준 & 아키텍처',
    '특허·논문 분석': '특허·논문 분석',
  },
  '팀 운영 가이드': {
    '개발 가이드라인': '팀 운영 가이드',
  },
  '주간·월간 보고 (보관)': {
    '2025년': '2025년 보고',
    '2026년': '2026년 보고',
  },
};

// MPS 문서의 과제별 하위 섹션 매핑 (제목에서 과제 추출)
// AA 스페이스 구조: 2025년 월간·주간 > 연구소 / AI 과제 / SW 과제 / ...
const MPS_TEAM_TO_SUBSECTION = {
  '전체': '연구소',   // 연구소 전체 MPS
  'AI': 'AI 과제',
  'SW': 'SW 과제',
  'Device': 'Device 과제',
};

/**
 * MPS 문서 제목에서 과제 팀을 추출합니다.
 * 예: "[AI] 2025-07 월간 MPS" → "AI"
 * 예: "[전체] 2025-07 월간 MPS" → "전체"
 * @param {string} title
 * @returns {string|null}
 */
function extractTeamFromTitle(title) {
  const match = title.match(/^\[(.+?)\]/);
  if (!match) return null;
  const team = match[1].trim();
  return MPS_TEAM_TO_SUBSECTION[team] ? team : null;
}

// ─── 이관 로그 관리 (중복 방지) ───────────────────────────────────────────────

/**
 * 이관 로그를 로드합니다.
 * @returns {{ migratedIds: Set<string>, log: object[] }}
 */
function loadMigrationLog() {
  if (!fs.existsSync(MIGRATION_LOG_PATH)) {
    return { migratedIds: new Set(), log: [] };
  }
  const data = JSON.parse(fs.readFileSync(MIGRATION_LOG_PATH, 'utf8'));
  return {
    migratedIds: new Set((data.log || []).map(e => e.sourcePageId)),
    log: data.log || [],
  };
}

/**
 * 이관 결과를 로그 파일에 저장합니다.
 * @param {object[]} log
 */
function saveMigrationLog(log) {
  const data = {
    lastRun: new Date().toISOString(),
    totalMigrated: log.length,
    log,
  };
  fs.writeFileSync(MIGRATION_LOG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Confluence API 클라이언트 ────────────────────────────────────────────────

/**
 * Confluence REST API 호출 (v2)
 * @param {string} method
 * @param {string} endpoint  - /wiki/api/v2/... 전체 경로
 * @param {object|null} body
 * @returns {Promise<object>}
 */
function confluenceRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
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
          try { resolve(JSON.parse(data)); }
          catch (e) { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode} [${method} ${endpoint}]: ${data.slice(0, 300)}`));
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

// ─── Confluence API 서비스 ────────────────────────────────────────────────────

/**
 * SD 스페이스 페이지의 실제 본문(storage HTML)을 가져옵니다.
 * @param {string} pageId
 * @returns {Promise<{body: string, version: object, authorDisplayName: string, createdAt: string}>}
 */
async function fetchPageDetail(pageId) {
  const data = await confluenceRequest(
    'GET',
    `/wiki/api/v2/pages/${pageId}?body-format=storage&include-version=true`
  );
  const authorId = data.version?.authorId;
  let authorName = authorId || '(알 수 없음)';

  // 작성자 이름 조회 시도
  try {
    const userInfo = await confluenceRequest('GET', `/wiki/rest/api/user?accountId=${authorId}`);
    authorName = userInfo.displayName || authorName;
  } catch (_) {
    // 무시 - 권한 없을 경우 ID로 표시
  }

  return {
    body: data.body?.storage?.value || '',
    version: data.version,
    authorDisplayName: authorName,
    createdAt: data.version?.createdAt || '',
  };
}

/**
 * AA 스페이스에서 제목으로 페이지 ID를 찾습니다.
 * @param {string} title
 * @returns {Promise<string|null>}
 */
async function findPageIdByTitle(title) {
  try {
    const encoded = encodeURIComponent(title);
    const data = await confluenceRequest(
      'GET',
      `/wiki/api/v2/pages?space-key=${AA_SPACE_KEY}&title=${encoded}&limit=5`
    );
    const results = data.results || [];
    return results.length > 0 ? results[0].id : null;
  } catch (_) {
    return null;
  }
}

/**
 * AA 스페이스 정보를 가져옵니다.
 * @returns {Promise<{spaceId: string, homepageId: string}>}
 */
async function getAASpaceInfo() {
  const data = await confluenceRequest('GET', `/wiki/api/v2/spaces?keys=${AA_SPACE_KEY}`);
  if (!data.results || data.results.length === 0) throw new Error("AA 스페이스를 찾을 수 없습니다.");
  const spaceInfo = data.results[0];
  return { spaceId: spaceInfo.id, homepageId: spaceInfo.homepageId };
}

/**
 * 새 페이지를 생성합니다.
 * @param {string} spaceId
 * @param {string} parentId
 * @param {string} title
 * @param {string} bodyHtml
 * @returns {Promise<{id: string, title: string, webUrl: string}>}
 */
async function createPage(spaceId, parentId, title, bodyHtml) {
  const result = await confluenceRequest('POST', '/wiki/api/v2/pages', {
    spaceId,
    parentId,
    status: 'current',
    title,
    body: {
      representation: 'storage',
      value: bodyHtml,
    },
  });
  return {
    id: result.id,
    title: result.title,
    webUrl: `${BASE_URL}/wiki${result._links?.webui || ''}`,
  };
}

/**
 * 페이지에 레이블을 부착합니다.
 * @param {string} pageId
 * @param {string[]} labels
 */
async function addLabels(pageId, labels) {
  if (!labels || labels.length === 0) return;
  const payload = labels.map(name => ({ prefix: 'global', name }));
  
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
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          console.warn(`레이블 부착 경고 (v1 API): HTTP ${res.statusCode}: ${data}`);
          resolve(); // 무시하고 진행
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// ─── 본문 변환 서비스 ─────────────────────────────────────────────────────────

/**
 * 이관된 페이지 본문에 원본 메타 정보 배너를 최상단에 삽입합니다.
 *
 * @param {string} originalBody - SD 원본 페이지의 storage HTML
 * @param {object} meta         - 메타 정보
 * @param {string} meta.sourcePageId
 * @param {string} meta.sourcePageTitle
 * @param {string} meta.sourcePageUrl
 * @param {string} meta.authorDisplayName
 * @param {string} meta.originalCreatedAt
 * @param {string} meta.category
 * @param {string} meta.subCategory
 * @param {string[]} meta.labels
 * @returns {string} 배너가 삽입된 HTML
 */
function buildBodyWithBanner(originalBody, meta) {
  const migratedAt = new Date().toISOString().split('T')[0];
  const originalDate = meta.originalCreatedAt
    ? meta.originalCreatedAt.split('T')[0]
    : '(날짜 정보 없음)';
  const labelsStr = (meta.labels || []).join(', ');

  // Confluence storage format 패널 (정보 박스)
  const banner = `
<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p><strong>📌 [AA 스페이스 이관 정보]</strong></p>
    <table>
      <tbody>
        <tr><td><strong>원본 스페이스</strong></td><td>SD (Digital R&amp;D Center)</td></tr>
        <tr><td><strong>원본 페이지</strong></td><td><a href="${meta.sourcePageUrl}">${escapeHtml(meta.sourcePageTitle)}</a></td></tr>
        <tr><td><strong>원작성자</strong></td><td>${escapeHtml(meta.authorDisplayName)}</td></tr>
        <tr><td><strong>원본 최종수정일</strong></td><td>${originalDate}</td></tr>
        <tr><td><strong>이관일</strong></td><td>${migratedAt}</td></tr>
        <tr><td><strong>분류</strong></td><td>${escapeHtml(meta.category)} &gt; ${escapeHtml(meta.subCategory)}</td></tr>
        <tr><td><strong>레이블</strong></td><td><code>${escapeHtml(labelsStr)}</code></td></tr>
      </tbody>
    </table>
    <p><em>※ 이 페이지는 SD 스페이스 원본을 복사한 것입니다. 원본은 SD 스페이스에서 계속 관리됩니다.</em></p>
  </ac:rich-text-body>
</ac:structured-macro>
<hr />
`;

  return banner + (originalBody || '');
}

/**
 * HTML 특수문자 이스케이프
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── 이관 후보 로더 ───────────────────────────────────────────────────────────

/**
 * analyze_migration_candidates.js의 로직을 재사용하여 이관 후보 목록을 동적으로 생성합니다.
 * (reference/migration_candidates.md의 데이터 원천과 동일)
 * @returns {object[]} 이관 후보 배열
 */
function loadMigrationCandidates() {
  const RESULT_PATH = path.join(__dirname, 'result_json');
  const allPages = [];

  for (let i = 1; i <= 3; i++) {
    const filePath = path.join(RESULT_PATH, `sd_v2_p${i}.json`);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    allPages.push(...(data.results || []));
  }

  if (allPages.length === 0) {
    throw new Error(
      'SD 스페이스 데이터(scripts/result_json/sd_v2_p*.json)가 없습니다.\n' +
      '먼저 SD 스페이스 데이터를 수집해주세요.'
    );
  }

  // analyze_migration_candidates.js의 분류 로직을 동적으로 로드
  const analyzeModule = require('./analyze_migration_candidates_lib');
  return analyzeModule.extractCandidates(allPages);
}

// ─── 이관 실행 서비스 ─────────────────────────────────────────────────────────

/**
 * AA 스페이스의 섹션 페이지 ID 캐시를 구성합니다.
 * setup_aa_space.js로 미리 생성된 섹션 페이지들의 ID를 조회합니다.
 * @returns {Promise<Map<string, string>>} 섹션 제목 → 페이지 ID
 */
async function buildSectionPageCache() {
  const sectionTitles = [
    '연간 MPS',
    '2025년 월간·주간',
    '2026년 월간·주간',
    '정부과제',
    'AI 프로젝트',
    'SW 프로젝트',
    'Device 프로젝트',
    'Solution 프로젝트',
    'AI·ML 기술',
    '제품·시장 조사',
    '기술 표준 & 아키텍처',
    '특허·논문 분석',
    '팀 운영 가이드',
    '2025년 보고',
    '2026년 보고',
  ];

  // MPS 연도별 섹션의 과제 하위 섹션
  const mpsYearSections = ['2025년 월간·주간', '2026년 월간·주간'];
  const mpsTeamSections = ['연구소', 'AI 과제', 'SW 과제', 'Device 과제'];

  const cache = new Map();
  console.log('AA 스페이스 섹션 페이지 ID 조회 중...');

  for (const title of sectionTitles) {
    const pageId = await findPageIdByTitle(title);
    if (pageId) {
      cache.set(title, pageId);
      console.log(`  ✅ "${title}" → ID: ${pageId}`);
    } else {
      console.warn(`  ⚠️  "${title}" 페이지를 찾을 수 없습니다. setup_aa_space.js를 먼저 실행하세요.`);
    }
    await sleep(300);
  }

  // MPS 과제별 하위 섹션 조회 (예: "2025년 월간·주간 > AI 과제")
  console.log('\nMPS 과제별 하위 섹션 조회 중...');
  for (const yearSection of mpsYearSections) {
    const yearPageId = cache.get(yearSection);
    if (!yearPageId) continue;

    for (const teamSection of mpsTeamSections) {
      const fullKey = `${yearSection} > ${teamSection}`;
      try {
        const encoded = encodeURIComponent(teamSection);
        const data = await confluenceRequest(
          'GET',
          `/wiki/api/v2/pages?space-key=${AA_SPACE_KEY}&title=${encoded}&limit=10`
        );
        // 해당 제목의 페이지 중 부모가 yearSection인 것 찾기
        const results = data.results || [];
        const match = results.find(r => r.parentId === yearPageId);
        if (match) {
          cache.set(fullKey, match.id);
          console.log(`  ✅ "${fullKey}" → ID: ${match.id}`);
        } else {
          console.warn(`  ⚠️  "${fullKey}" 하위 페이지를 찾을 수 없습니다.`);
        }
      } catch (err) {
        console.warn(`  ⚠️  "${fullKey}" 조회 실패: ${err.message}`);
      }
      await sleep(300);
    }
  }

  return cache;
}

/**
 * 이관 후보 하나를 AA 스페이스에 복사합니다.
 *
 * @param {object} candidate - 이관 후보 페이지 정보
 * @param {string} spaceId   - AA 스페이스 ID
 * @param {Map<string,string>} sectionCache - 섹션 제목 → 페이지 ID 캐시
 * @returns {Promise<{success: boolean, newPageId?: string, newPageUrl?: string, error?: string}>}
 */
async function migrateSinglePage(candidate, spaceId, sectionCache) {
  // 1. 부모 섹션 페이지 ID 결정
  const catMap = CATEGORY_TO_AA_PARENT[candidate.category];
  if (!catMap) {
    return { success: false, error: `알 수 없는 카테고리: ${candidate.category}` };
  }
  let parentTitle = catMap[candidate.subCategory];
  if (!parentTitle) {
    return { success: false, error: `알 수 없는 서브카테고리: ${candidate.subCategory}` };
  }

  // MPS 이력인 경우 과제별 하위 섹션으로 매핑
  if (candidate.category === 'MPS 이력') {
    const team = extractTeamFromTitle(candidate.title);
    if (team) {
      const subSection = MPS_TEAM_TO_SUBSECTION[team];
      parentTitle = `${parentTitle} > ${subSection}`;
    }
  }

  const parentId = sectionCache.get(parentTitle);
  if (!parentId) {
    return { success: false, error: `부모 페이지 ID 없음: "${parentTitle}" (setup_aa_space.js 먼저 실행)` };
  }

  // 2. SD 원본 페이지 상세 정보 조회
  let detail;
  try {
    detail = await fetchPageDetail(candidate.id);
  } catch (err) {
    return { success: false, error: `원본 페이지 조회 실패: ${err.message}` };
  }

  // 3. 배너 삽입된 본문 생성
  const bodyWithBanner = buildBodyWithBanner(detail.body, {
    sourcePageId: candidate.id,
    sourcePageTitle: candidate.title,
    sourcePageUrl: candidate.url,
    authorDisplayName: detail.authorDisplayName,
    originalCreatedAt: detail.createdAt,
    category: candidate.category,
    subCategory: candidate.subCategory,
    labels: candidate.labels,
  });

  // 4. AA 스페이스에 새 페이지 생성
  let newPage;
  try {
    newPage = await createPage(spaceId, parentId, candidate.title, bodyWithBanner);
  } catch (err) {
    return { success: false, error: `페이지 생성 실패: ${err.message}` };
  }

  // 5. 레이블 부착 (rag-source는 항상 추가)
  const allLabels = [...new Set([...candidate.labels, 'rag-source', 'migrated-sd'])];
  const validLabels = allLabels;
  try {
    await addLabels(newPage.id, validLabels);
  } catch (err) {
    console.warn(`    ⚠️  레이블 부착 실패 (페이지는 생성됨): ${err.message}`);
  }

  return {
    success: true,
    newPageId: newPage.id,
    newPageUrl: newPage.webUrl,
  };
}

// ─── 메인 실행 ────────────────────────────────────────────────────────────────

async function main() {
  console.log('========================================');
  console.log('  AA 스페이스 이관 스크립트');
  console.log('========================================');
  console.log(`모드: ${DRY_RUN ? '🔍 DRY-RUN (실제 생성 없음)' : '🚀 실제 실행'}`);
  if (CATEGORY_FILTER) {
    console.log(`필터: "${CATEGORY_FILTER}" 카테고리만 이관`);
  }
  console.log('');

  // ── 이관 후보 로드 ──────────────────────────────────────────────────────────
  console.log('[1/4] 이관 후보 목록 로드 중...');
  let candidates;
  try {
    candidates = loadMigrationCandidates();
  } catch (err) {
    // analyze_migration_candidates_lib.js가 없는 경우 → migration_candidates.md 파싱으로 폴백
    console.warn(`  경고: ${err.message}`);
    console.warn('  → reference/migration_candidates.md에서 직접 후보를 파싱합니다.');
    candidates = parseMigrationCandidatesMd();
  }

  if (CATEGORY_FILTER) {
    candidates = candidates.filter(c => c.category === CATEGORY_FILTER);
  }

  // 이미 이관된 페이지 제외
  const { migratedIds, log: existingLog } = loadMigrationLog();
  const toMigrate = candidates.filter(c => !migratedIds.has(c.id));
  const skipped = candidates.length - toMigrate.length;

  console.log(`  총 후보: ${candidates.length}개`);
  console.log(`  이미 이관됨 (스킵): ${skipped}개`);
  console.log(`  이관 예정: ${toMigrate.length}개\n`);

  if (toMigrate.length === 0) {
    console.log('✅ 이관할 항목이 없습니다. 모두 완료되었습니다.');
    return;
  }

  if (DRY_RUN) {
    // ── DRY-RUN: 예정 목록만 출력 ────────────────────────────────────────────
    console.log('[DRY-RUN] 이관 예정 목록:');
    console.log('');
    const byCategory = {};
    toMigrate.forEach(c => {
      const key = `${c.category} > ${c.subCategory}`;
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(c);
    });
    Object.entries(byCategory).forEach(([key, pages]) => {
      console.log(`📁 ${key} (${pages.length}개)`);
      pages.forEach(p => {
        const labelStr = (p.labels || []).join(', ');
        console.log(`   - ${p.title}`);
        console.log(`     레이블: ${labelStr}`);
        console.log(`     원본: ${p.url}`);
      });
      console.log('');
    });
    console.log('──────────────────────────────────────────');
    console.log(`DRY-RUN 완료. 총 ${toMigrate.length}개 페이지가 이관될 예정입니다.`);
    console.log('실제 이관: --dry-run 옵션을 제거하고 실행하세요.');
    return;
  }

  // ── 실제 이관 ─────────────────────────────────────────────────────────────
  console.log('[2/4] AA 스페이스 정보 조회 중...');
  let spaceId;
  try {
    const spaceInfo = await getAASpaceInfo();
    spaceId = spaceInfo.spaceId;
    console.log(`  스페이스 ID: ${spaceId}\n`);
  } catch (err) {
    console.error(`❌ AA 스페이스 조회 실패: ${err.message}`);
    process.exit(1);
  }

  console.log('[3/4] 섹션 페이지 ID 캐시 구성 중...');
  const sectionCache = await buildSectionPageCache();
  console.log('');

  console.log('[4/4] 페이지 이관 시작...\n');
  const newLog = [...existingLog];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toMigrate.length; i++) {
    const candidate = toMigrate[i];
    const progress = `[${i + 1}/${toMigrate.length}]`;
    console.log(`${progress} 이관 중: "${candidate.title}"`);
    console.log(`         카테고리: ${candidate.category} > ${candidate.subCategory}`);

    const result = await migrateSinglePage(candidate, spaceId, sectionCache);

    if (result.success) {
      successCount++;
      console.log(`         ✅ 완료 → ${result.newPageUrl}`);
      newLog.push({
        sourcePageId: candidate.id,
        sourcePageTitle: candidate.title,
        sourcePageUrl: candidate.url,
        newPageId: result.newPageId,
        newPageUrl: result.newPageUrl,
        category: candidate.category,
        subCategory: candidate.subCategory,
        labels: candidate.labels,
        migratedAt: new Date().toISOString(),
      });
    } else {
      failCount++;
      console.error(`         ❌ 실패: ${result.error}`);
      newLog.push({
        sourcePageId: candidate.id,
        sourcePageTitle: candidate.title,
        sourcePageUrl: candidate.url,
        category: candidate.category,
        subCategory: candidate.subCategory,
        error: result.error,
        migratedAt: new Date().toISOString(),
        failed: true,
      });
    }

    // 로그 즉시 저장 (중간 실패 시에도 진행 상황 보존)
    saveMigrationLog(newLog);

    // Rate Limit 방지 딜레이
    if (i < toMigrate.length - 1) {
      await sleep(API_DELAY_MS);
    }
  }

  // ── 최종 결과 요약 ──────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log('  이관 완료 요약');
  console.log('========================================');
  console.log(`  성공: ${successCount}개`);
  console.log(`  실패: ${failCount}개`);
  console.log(`  스킵 (기이관): ${skipped}개`);
  console.log(`  이관 로그: ${MIGRATION_LOG_PATH}`);
  console.log(`  AA 스페이스: ${BASE_URL}/wiki/spaces/${AA_SPACE_KEY}/overview`);

  if (failCount > 0) {
    console.log('\n⚠️  일부 페이지 이관에 실패했습니다.');
    console.log('   실패한 항목은 migration_log.json에서 확인하고 재시도하세요.');
    console.log('   (이미 성공한 항목은 재실행 시 자동으로 스킵됩니다)');
  }
}

// ─── migration_candidates.md 파싱 (폴백) ─────────────────────────────────────

/**
 * reference/migration_candidates.md를 파싱하여 이관 후보 배열을 반환합니다.
 * analyze_migration_candidates_lib.js 없이도 동작하는 폴백 방법입니다.
 * @returns {object[]}
 */
function parseMigrationCandidatesMd() {
  const mdPath = path.join(__dirname, '..', 'reference', 'migration_candidates.md');
  if (!fs.existsSync(mdPath)) {
    throw new Error('reference/migration_candidates.md 파일이 없습니다.');
  }

  // CRLF → LF 정규화
  const content = fs.readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = content.split('\n');
  const candidates = [];
  let currentCategory = null;
  let currentSubCategory = null;
  let inTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // ## 카테고리 헤더 (예: ## MPS 이력 (73개))
    const catMatch = line.match(/^## (.+?) \(\d+개\)/);
    if (catMatch) {
      currentCategory = catMatch[1].trim();
      currentSubCategory = null;
      inTable = false;
      continue;
    }

    // ### 서브카테고리 헤더 (예: ### 2025년 월간·주간 (45개))
    const subCatMatch = line.match(/^### (.+?) \(\d+개\)/);
    if (subCatMatch) {
      currentSubCategory = subCatMatch[1].trim();
      inTable = false;
      continue;
    }

    // 테이블 헤더/구분선 스킵
    if (line.startsWith('| 제목') || line.startsWith('|---')) {
      inTable = true;
      continue;
    }

    // 다른 ## 또는 ### 섹션 시작 시 테이블 종료
    if (line.startsWith('#')) {
      inTable = false;
      continue;
    }

    if (inTable && currentCategory && currentSubCategory && line.startsWith('|')) {
      // 파이프로 구분된 컬럼 파싱
      // 예: | [제목](url) | 2025-01-01 | 이관사유 | label1, label2 |
      const cols = line.split('|').map(c => c.trim()).filter((c, i) => i > 0); // 첫 빈 항목 제거
      if (cols.length < 4) continue;

      // 제목과 URL 파싱: [제목](url)
      const titleUrlMatch = cols[0].match(/^\[(.+?)\]\((.+?)\)$/);
      if (!titleUrlMatch) continue;

      const title = titleUrlMatch[1].trim();
      const url = titleUrlMatch[2].trim();
      const lastModified = cols[1].trim();
      // cols[2] = reason, cols[3] = labels (마지막 빈 항목 제외)
      const labelStr = cols[3] ? cols[3].replace(/\|$/, '').trim() : '';
      const labels = labelStr.split(',').map(l => l.trim()).filter(Boolean);

      // URL에서 페이지 ID 추출 (/pages/12345/ 패턴)
      const idMatch = url.match(/\/pages\/(\d+)/);
      const id = idMatch ? idMatch[1] : null;

      if (id && title) {
        candidates.push({
          id,
          title,
          url,
          lastModified,
          labels,
          category: currentCategory,
          subCategory: currentSubCategory,
        });
      }
    }
  }

  console.log(`  migration_candidates.md에서 ${candidates.length}개 후보 파싱 완료`);
  return candidates;
}

// ─── 진입점 ───────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('\n치명적 오류:', err.message);
  process.exit(1);
});
