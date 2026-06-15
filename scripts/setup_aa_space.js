/**
 * setup_aa_space.js
 *
 * AA 스페이스(덴탈AI연구소 운영 아카이브)의 페이지 계층 구조를 생성합니다.
 * AA 스페이스 키: AA
 * 인스턴스: https://neobiotech.atlassian.net
 *
 * 실행: node scripts/setup_aa_space.js [--dry-run]
 *   --dry-run : 실제 API 호출 없이 생성될 구조만 출력
 *
 * 필수 환경변수 (.env):
 *   CONFLUENCE_EMAIL=your@email.com
 *   CONFLUENCE_TOKEN=your_api_token
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https = require('https');

// ─── 설정 ─────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://neobiotech.atlassian.net';
const AA_SPACE_KEY = 'AA';
const DRY_RUN = process.argv.includes('--dry-run');

const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_TOKEN;

if (!DRY_RUN && (!EMAIL || !TOKEN)) {
  console.error('오류: .env 파일에 CONFLUENCE_EMAIL, CONFLUENCE_TOKEN을 설정하세요.');
  process.exit(1);
}

const AUTH_HEADER = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;

// ─── AA 스페이스 계층 구조 정의 ──────────────────────────────────────────────

/**
 * AA 스페이스 페이지 트리 정의
 * 각 노드: { title, body, labels, children }
 *
 * body는 ADF(Atlassian Document Format) 또는 storage 형식 HTML
 */
const AA_SPACE_TREE = {
  home: {
    title: 'AA 스페이스 운영 정책 가이드',
    body: buildHomepageBody(),
    labels: ['doctype:guideline', 'team:center', 'status:evergreen'],
    children: [
      {
        title: 'MPS 이력',
        body: buildSectionBody('MPS 이력', 'AI/SW/Device/Solution/R&D 팀의 연간·월간·주간 MPS 이력을 보관합니다.'),
        labels: ['doctype:mps-monthly', 'team:center', 'status:active'],
        children: [
          {
            title: '연간 MPS',
            body: buildSectionBody('연간 MPS', '팀별 연간 MPS 전략 계획서 (LLM이 가장 먼저 참조하는 핵심 문서)'),
            labels: ['doctype:mps-annual', 'team:center', 'status:active', 'rag:priority'],
            children: [],
          },
          {
            title: '2025년 월간·주간',
            body: buildSectionBody('2025년 월간·주간', '2025년도 팀별 월간/주간 MPS 문서'),
            labels: ['year:2025', 'team:center', 'status:completed'],
            children: [],
          },
          {
            title: '2026년 월간·주간',
            body: buildSectionBody('2026년 월간·주간', '2026년도 팀별 월간/주간 MPS 문서'),
            labels: ['year:2026', 'team:center', 'status:active'],
            children: [],
          },
        ],
      },
      {
        title: '프로젝트 현황',
        body: buildSectionBody('프로젝트 현황', '팀별 진행 중인 프로젝트와 정부과제 현황을 관리합니다.'),
        labels: ['doctype:project-status', 'team:center', 'status:active'],
        children: [
          {
            title: '정부과제',
            body: buildSectionBody('정부과제', '진행 중인 정부 지원 과제 현황 요약'),
            labels: ['doctype:gov-project', 'team:rnd', 'status:active'],
            children: [],
          },
          {
            title: 'AI 프로젝트',
            body: buildSectionBody('AI 프로젝트', 'AI 팀 프로젝트 현황 및 로드맵'),
            labels: ['doctype:project-status', 'team:ai', 'status:active'],
            children: [],
          },
          {
            title: 'SW 프로젝트',
            body: buildSectionBody('SW 프로젝트', 'SW 팀 프로젝트 현황'),
            labels: ['doctype:project-status', 'team:sw', 'status:active'],
            children: [],
          },
          {
            title: 'Device 프로젝트',
            body: buildSectionBody('Device 프로젝트', 'Device 팀 프로젝트 현황 (Neo Robot 등)'),
            labels: ['doctype:project-status', 'team:device', 'status:active'],
            children: [],
          },
          {
            title: 'Solution 프로젝트',
            body: buildSectionBody('Solution 프로젝트', 'Solution 팀 프로젝트 현황'),
            labels: ['doctype:project-status', 'team:solution', 'status:active'],
            children: [],
          },
        ],
      },
      {
        title: '기술 조사 & 인사이트',
        body: buildSectionBody('기술 조사 & 인사이트', 'MPS 계획에 활용할 수 있는 기술 조사 및 시장 분석 자료'),
        labels: ['doctype:tech-survey', 'team:center', 'status:active'],
        children: [
          {
            title: 'AI·ML 기술',
            body: buildSectionBody('AI·ML 기술', 'RAG, Fine-tuning, Agent, MCP 등 AI/ML 기술 조사'),
            labels: ['doctype:tech-survey', 'team:ai', 'status:active'],
            children: [],
          },
          {
            title: '제품·시장 조사',
            body: buildSectionBody('제품·시장 조사', '전시회 분석, 경쟁사, 치과 시장 동향'),
            labels: ['doctype:market-survey', 'team:center', 'status:active'],
            children: [],
          },
          {
            title: '기술 표준 & 아키텍처',
            body: buildSectionBody('기술 표준 & 아키텍처', '소프트웨어 아키텍처, 개발 표준, 방법론'),
            labels: ['doctype:tech-survey', 'team:sw', 'status:active'],
            children: [],
          },
          {
            title: '특허·논문 분석',
            body: buildSectionBody('특허·논문 분석', '특허 조사 및 논문 리뷰 자료'),
            labels: ['doctype:patent', 'team:rnd', 'status:active'],
            children: [],
          },
        ],
      },
      {
        title: '팀 운영 가이드',
        body: buildSectionBody('팀 운영 가이드', 'MPS 작성 프로세스, 개발 표준, AI 활용 가이드라인'),
        labels: ['doctype:guideline', 'team:center', 'status:evergreen'],
        children: [],
      },
      {
        title: '주간·월간 보고 (보관)',
        body: buildSectionBody('주간·월간 보고 (보관)', '팀 주간 업무 공유 보고서 (최근 1년치 보관)'),
        labels: ['doctype:mps-weekly', 'team:center', 'status:active'],
        children: [
          {
            title: '2025년 보고',
            body: buildSectionBody('2025년 보고', '2025년 주간·월간 보고'),
            labels: ['year:2025', 'team:center', 'doctype:mps-weekly'],
            children: [],
          },
          {
            title: '2026년 보고',
            body: buildSectionBody('2026년 보고', '2026년 주간·월간 보고'),
            labels: ['year:2026', 'team:center', 'doctype:mps-weekly'],
            children: [],
          },
        ],
      },
    ],
  },
};

// ─── 페이지 본문 빌더 ────────────────────────────────────────────────────────

function buildHomepageBody() {
  return `<h1>AA 스페이스 (덴탈AI연구소 운영 아카이브)</h1>
<p>이 스페이스는 <strong>MPS 계획·평가 자동화</strong>를 위한 선별된 지식 허브입니다.</p>
<h2>스페이스 목적</h2>
<ul>
  <li>MPS(Mission/Performance objectives/Strategy) 작성·평가 시 LLM이 참조할 데이터 원천 제공</li>
  <li>SD 스페이스에서 가치 있는 문서만 선별하여 정제·보관</li>
  <li>레이블 기반 체계적 분류로 RAG 검색 품질 최적화</li>
</ul>
<h2>레이블 체계</h2>
<table>
  <tr><th>그룹</th><th>레이블</th><th>설명</th></tr>
  <tr><td>팀(Team)</td><td>team:ai / team:sw / team:device / team:solution / team:rnd / team:center</td><td>문서 소유 팀</td></tr>
  <tr><td>문서유형(DocType)</td><td>doctype:mps-annual / doctype:mps-monthly / doctype:project-status / doctype:tech-survey / doctype:guideline ...</td><td>문서 성격</td></tr>
  <tr><td>연도(Year)</td><td>year:2024 / year:2025 / year:2026</td><td>문서 유효 연도</td></tr>
  <tr><td>상태(Status)</td><td>status:active / status:completed / status:evergreen / status:review-needed</td><td>문서 유효성 상태</td></tr>
</table>
<h2>명명 규칙</h2>
<ul>
  <li>MPS: <code>[팀] YYYY-MM 월간 MPS</code> / <code>[팀] YYYY 연간 MPS</code></li>
  <li>프로젝트: <code>[과제명] 현황 요약 (YYYY)</code></li>
  <li>기술 조사: <code>[주제] 기술 조사 (YYYY-MM)</code></li>
  <li>가이드라인: <code>[주제] 가이드라인 vX.X</code></li>
</ul>
<h2>유효기간 정책</h2>
<ul>
  <li>MPS 이력: 무기한 보관 (완료 시 status:completed)</li>
  <li>기술 조사: 2년 후 review-needed</li>
  <li>주간 보고: 1년 후 SD 스페이스로 이동</li>
  <li>가이드라인: evergreen (버전업 유지)</li>
</ul>
<p><em>원본 문서: SD 스페이스(Digital R&amp;D Center) | 정책 수립: 2026-06-15</em></p>`;
}

function buildSectionBody(title, description) {
  return `<h1>${title}</h1>
<p>${description}</p>
<p><em>이 페이지는 섹션 인덱스입니다. 하위 페이지를 참조하세요.</em></p>`;
}

// ─── Confluence API 호출 ──────────────────────────────────────────────────────

/**
 * Confluence REST API v2 호출
 * @param {string} method
 * @param {string} endpoint
 * @param {object|null} body
 * @returns {Promise<object>}
 */
function confluenceRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/wiki/api/v2${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': AUTH_HEADER,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch (e) { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * AA 스페이스의 홈페이지 ID 조회
 * @returns {Promise<string>}
 */
async function getAASpaceHomepageId() {
  const data = await confluenceRequest('GET', `/spaces/${AA_SPACE_KEY}`);
  return data.homepageId;
}

/**
 * 페이지 생성
 * @param {string} spaceId
 * @param {string} parentId
 * @param {string} title
 * @param {string} bodyHtml
 * @returns {Promise<{id: string, title: string, webUrl: string}>}
 */
async function createPage(spaceId, parentId, title, bodyHtml) {
  const payload = {
    spaceId,
    parentId,
    status: 'current',
    title,
    body: {
      representation: 'storage',
      value: bodyHtml,
    },
  };

  const result = await confluenceRequest('POST', '/pages', payload);
  return {
    id: result.id,
    title: result.title,
    webUrl: `${BASE_URL}/wiki${result._links?.webui || ''}`,
  };
}

/**
 * 페이지에 레이블 일괄 부착
 * @param {string} pageId
 * @param {string[]} labels
 */
async function addLabels(pageId, labels) {
  if (!labels || labels.length === 0) return;
  const payload = labels.map(name => ({ prefix: 'global', name }));
  await confluenceRequest('POST', `/pages/${pageId}/labels`, payload);
}

/**
 * 재귀적으로 페이지 트리 생성
 * @param {string} spaceId
 * @param {string} parentId
 * @param {object[]} nodes
 * @param {string} indent
 */
async function createPageTree(spaceId, parentId, nodes, indent = '') {
  for (const node of nodes) {
    if (DRY_RUN) {
      console.log(`${indent}[DRY-RUN] 생성 예정: "${node.title}"`);
      console.log(`${indent}          레이블: ${node.labels.join(', ')}`);
      if (node.children && node.children.length > 0) {
        await createPageTree(spaceId, 'DUMMY_ID', node.children, indent + '  ');
      }
      continue;
    }

    try {
      console.log(`${indent}생성 중: "${node.title}"...`);
      const page = await createPage(spaceId, parentId, node.title, node.body);
      console.log(`${indent}✅ 완료: ${page.title} (id:${page.id})`);

      // 레이블 부착
      if (node.labels && node.labels.length > 0) {
        await addLabels(page.id, node.labels);
        console.log(`${indent}   레이블: ${node.labels.join(', ')}`);
      }

      // rate limit 방지 딜레이
      await sleep(500);

      // 자식 페이지 재귀 생성
      if (node.children && node.children.length > 0) {
        await createPageTree(spaceId, page.id, node.children, indent + '  ');
      }
    } catch (err) {
      console.error(`${indent}❌ 오류 (${node.title}): ${err.message}`);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 메인 실행 ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== AA 스페이스 구조 생성 시작 ===');
  console.log(`모드: ${DRY_RUN ? 'DRY-RUN (실제 생성 없음)' : '실제 실행'}`);
  console.log('');

  let spaceId;
  let homepageId;

  if (DRY_RUN) {
    console.log('[DRY-RUN] AA 스페이스 정보 조회 생략\n');
    spaceId = 'DUMMY_SPACE_ID';
    homepageId = 'DUMMY_HOME_ID';
  } else {
    console.log('AA 스페이스 홈페이지 ID 조회...');
    const spaceInfo = await confluenceRequest('GET', `/spaces/${AA_SPACE_KEY}`);
    spaceId = spaceInfo.id;
    homepageId = spaceInfo.homepageId;
    console.log(`  스페이스 ID: ${spaceId}`);
    console.log(`  홈페이지 ID: ${homepageId}`);
    console.log('');
  }

  // 홈페이지 업데이트 (정책 가이드로)
  if (!DRY_RUN) {
    console.log('홈페이지 내용 업데이트 중...');
    try {
      // 현재 버전 확인
      const currentPage = await confluenceRequest('GET', `/pages/${homepageId}`);
      const currentVersion = currentPage.version?.number || 1;

      await confluenceRequest('PUT', `/pages/${homepageId}`, {
        id: homepageId,
        status: 'current',
        title: AA_SPACE_TREE.home.title,
        body: {
          representation: 'storage',
          value: AA_SPACE_TREE.home.body,
        },
        version: { number: currentVersion + 1 },
      });
      await addLabels(homepageId, AA_SPACE_TREE.home.labels);
      console.log('✅ 홈페이지 업데이트 완료\n');
    } catch (err) {
      console.warn(`홈페이지 업데이트 실패 (무시): ${err.message}\n`);
    }
  } else {
    console.log(`[DRY-RUN] 홈페이지 업데이트 예정: "${AA_SPACE_TREE.home.title}"`);
    console.log(`          레이블: ${AA_SPACE_TREE.home.labels.join(', ')}\n`);
  }

  // 하위 페이지 트리 생성
  console.log('하위 페이지 구조 생성...\n');
  await createPageTree(spaceId, homepageId, AA_SPACE_TREE.home.children);

  console.log('\n=== AA 스페이스 구조 생성 완료 ===');
  if (DRY_RUN) {
    console.log('실제 생성을 원하면 --dry-run 옵션을 제거하고 실행하세요.');
  } else {
    console.log(`AA 스페이스 확인: ${BASE_URL}/wiki/spaces/${AA_SPACE_KEY}/overview`);
  }
}

main().catch(err => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
