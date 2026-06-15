/**
 * analyze_migration_candidates.js
 *
 * SD 스페이스의 v2 JSON 데이터를 분석하여 AA 스페이스 이관 후보 페이지 목록을 추출합니다.
 * 정책 기준: AA_space_design_plan.md 참고
 *
 * 실행: node scripts/analyze_migration_candidates.js
 * 출력: reference/migration_candidates.md
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── 설정 ─────────────────────────────────────────────────────────────────────

const BASE_PATH = path.join(__dirname, '..', 'reference');
const RESULT_PATH = path.join(__dirname, 'result_json');
const OUTPUT_FILE = path.join(BASE_PATH, 'migration_candidates.md');

/** 이관 대상 최신성 기준일 (이 날짜 이후 수정된 페이지만 이관) */
const CUTOFF_DATE = new Date('2024-01-01T00:00:00Z');

// ─── 이관 정책 규칙 ───────────────────────────────────────────────────────────

/**
 * 폴더 ID → 폴더 이름 매핑 (analyze_sd_v2_full.js 실행 결과 기반)
 * 실제 폴더 이름은 Confluence API 호출로 확인 필요하나,
 * 여기서는 페이지 제목 기반으로 폴더 경로를 추론합니다.
 */

/**
 * 제목 기반 MPS 페이지 판별
 * @param {string} title
 * @returns {boolean}
 */
function isMpsPage(title) {
  const patterns = [
    /월간\s*MPS/i,
    /연간\s*MPS/i,
    /MPS\s*\d{4}/i,
    /\d{4}[년\-]\s*\d{1,2}[월\-]/,
    /AI MPS/i,
    /SW MPS/i,
    /Device\s*MPS/i,
    /Solution\s*MPS/i,
    /R&D\s*MPS/i,
    /MPS.*Planning/i,
    /MPS.*Evaluation/i,
    /MPS 작성/i,
    /Weekly MPS/i,
  ];
  return patterns.some(p => p.test(title));
}

/**
 * 제목 기반 Daily Scrum 페이지 판별 (제외 대상)
 * @param {string} title
 * @returns {boolean}
 */
function isDailyScrumPage(title) {
  return /Daily Scrum/i.test(title) || /^\d{4}-\d{2}-\d{2}$/.test(title.trim());
}

/**
 * 제목 기반 Archived 페이지 판별 (제외 대상)
 * @param {string} title
 * @returns {boolean}
 */
function isArchivedPage(title) {
  return /^Archived\s/i.test(title);
}

/**
 * 제목 기반 단순 주간 기록 날짜 페이지 판별 (제외 대상)
 * @param {string} title
 * @returns {boolean}
 */
function isWeeklyDateRecord(title) {
  // "2024-05-20 ~ 2024-05-24" 형식
  return /^\d{4}-\d{2}-\d{2}\s*[~\-]\s*\d{4}-\d{2}/.test(title.trim());
}

/**
 * 이관 카테고리 분류 - 제목과 부모 계층으로 판별
 * @param {object} page
 * @param {Map<string,object>} pageMap
 * @returns {{category: string, subCategory: string, labels: string[]} | null}
 */
function classifyPage(page, pageMap) {
  const title = page.title;
  const lastModified = new Date(page.version.createdAt);

  // ── 제외 조건 ──────────────────────────────────────────────────────────────
  if (page.status === 'archived') return null;
  if (isArchivedPage(title)) return null;
  if (isDailyScrumPage(title)) return null;
  if (isWeeklyDateRecord(title)) return null;
  if (lastModified < CUTOFF_DATE) return null;

  // ── 조상 페이지 경로 추출 ──────────────────────────────────────────────────
  const ancestors = getAncestorTitles(page, pageMap);
  const ancestorStr = ancestors.join(' > ');

  // ── 이관 카테고리 분류 ─────────────────────────────────────────────────────

  // 1. MPS 이력
  if (isMpsPage(title)) {
    const team = detectTeam(title, ancestors);
    const docType = detectMpsDocType(title);
    const year = detectYear(title, lastModified);
    // MPS subCategory: 연간은 별도 폴더, 월간·주간은 연도별 폴더
    const isAnnual = /연간/i.test(title);
    const subCategory = isAnnual ? '연간 MPS' : `${year}년 월간·주간`;
    return {
      category: 'MPS 이력',
      subCategory,
      labels: [team, docType, year ? `year:${year}` : '', 'status:completed'].filter(Boolean),
      reason: 'MPS 문서',
    };
  }

  // 2. 주간 업무 공유 보고 (2025년 이후 전체)
  if (/주간\s*업무\s*공유|디지털개발실\s*주간/i.test(title)) {
    const year = lastModified.getFullYear();
    if (year >= 2025) {
      return {
        category: '주간·월간 보고 (보관)',
        subCategory: `${year}년`,
        labels: ['team:center', 'doctype:mps-weekly', `year:${year}`, 'status:active'],
        reason: '주간 보고 (2025년 이후 전체)',
      };
    }
    return null;
  }

  // 3. 정부과제 (전체 이관 — RAG 활용을 위해 레이블 부착)
  if (
    /정부과제/i.test(ancestorStr) ||
    /강원지역혁신클러스터/i.test(title) ||
    /글로벌기업산업기술/i.test(title) ||
    /중기부\s*소부장/i.test(title) ||
    /지역혁신클러스터/i.test(title) ||
    /2026.*강원|2026.*글로벌|2026.*소부장/i.test(title)
  ) {
    const year = lastModified.getFullYear();
    // 문서 성격에 따라 세부 레이블 구분
    let subLabel = 'status:active';
    if (/기획|계획/i.test(title)) subLabel = 'phase:planning';
    else if (/구현|개발|검증/i.test(title)) subLabel = 'phase:implementation';
    else if (/완료|릴리스|종료/i.test(title)) subLabel = 'status:completed';
    return {
      category: '프로젝트 현황',
      subCategory: '정부과제',
      labels: ['team:rnd', 'doctype:gov-project', `year:${year}`, subLabel, 'rag:source'],
      reason: '정부과제 전체 (RAG 소스)',
    };
  }

  // 4. AI 프로젝트 현황 (회의록 제외)
  if (
    /AI 과제 관리/i.test(title) ||
    /개발효율화.*자율개발/i.test(title) ||
    /AI.*과제.*현황/i.test(title) ||
    /AI.*로드맵/i.test(title)
  ) {
    if (/회의록|ToDo|WIP/i.test(title)) return null;
    const year = lastModified.getFullYear();
    return {
      category: '프로젝트 현황',
      subCategory: 'AI 프로젝트',
      labels: ['team:ai', 'doctype:project-status', `year:${year}`, 'status:active'],
      reason: 'AI 프로젝트 현황',
    };
  }

  // 5. Agent2Agent / MCP 기술 조사
  if (/Agent2Agent|A2A\s|MCP\s|MCP$/i.test(title)) {
    const year = lastModified.getFullYear();
    return {
      category: '기술 조사 & 인사이트',
      subCategory: 'AI·ML 기술',
      labels: ['team:ai', 'doctype:tech-survey', `year:${year}`, 'status:active'],
      reason: 'AI/MCP 기술 조사',
    };
  }

  // 6. Neo Robot 과제 — 전체 이관 (진행 중, 확인 후 조정 예정)
  if (
    /Neo Robot-Guided/i.test(title) ||
    /Neo Robot-Guided/i.test(ancestorStr) ||
    /ChapGPT.*로봇|GPT.*로봇|Robot.*GPT|Voice Robot|IR Marker/i.test(title)
  ) {
    const year = lastModified.getFullYear();
    return {
      category: '프로젝트 현황',
      subCategory: 'Device 프로젝트',
      labels: ['team:device', 'doctype:project-status', `year:${year}`, 'status:active', 'rag:source'],
      reason: 'Neo Robot 과제 전체 (진행 중, 검토 예정)',
    };
  }

  // 7. R&D AI 기술 조사 (RAG, Fine-tuning 등)
  if (
    /R&D AI/i.test(ancestorStr) ||
    /RAG/i.test(title) ||
    /Fine-tuning/i.test(title) ||
    /sLM|LLM|딥러닝|Deep Learning/i.test(title)
  ) {
    if (/실험 노트|WIP|Draft/i.test(title)) return null;
    const year = lastModified.getFullYear();
    return {
      category: '기술 조사 & 인사이트',
      subCategory: 'AI·ML 기술',
      labels: ['team:ai', 'doctype:tech-survey', `year:${year}`, 'status:active'],
      reason: 'R&D AI 기술 조사',
    };
  }

  // 8. Survey 전시회 분석 (IDS, KDX, SIDEX - 분석 결과만)
  if (
    /IDS 2025|KDX 2025|SIDEX|전시회.*분석|Exhibition.*분석/i.test(title) ||
    /AI 의료 영상 분석/i.test(title)
  ) {
    const year = lastModified.getFullYear();
    return {
      category: '기술 조사 & 인사이트',
      subCategory: '제품·시장 조사',
      labels: ['team:center', 'doctype:market-survey', `year:${year}`, 'status:active'],
      reason: '전시회/시장 조사',
    };
  }

  // 9. How To Develop 핵심 가이드 (팀 공통)
  if (
    /How To Develop/i.test(ancestorStr) ||
    /Git.*전략|Branch Strategy|CI\/CD|형상관리|Configuration Management/i.test(title) ||
    /MPS 작성 Process/i.test(title)
  ) {
    if (/특정 프로젝트/i.test(title)) return null;
    const year = lastModified.getFullYear();
    return {
      category: '팀 운영 가이드',
      subCategory: '개발 가이드라인',
      labels: ['team:center', 'doctype:guideline', `year:${year}`, 'status:evergreen'],
      reason: '팀 공통 개발 가이드',
    };
  }

  // 10. AI Evangelist 보고서·분석
  if (/AI Evangelist/i.test(ancestorStr)) {
    if (/링크 모음|단순/i.test(title)) return null;
    const year = lastModified.getFullYear();
    return {
      category: '기술 조사 & 인사이트',
      subCategory: 'AI·ML 기술',
      labels: ['team:ai', 'doctype:tech-survey', `year:${year}`, 'status:active'],
      reason: 'AI Evangelist 보고서',
    };
  }

  return null;
}

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

/**
 * 조상 페이지 제목 배열 반환
 * @param {object} page
 * @param {Map<string,object>} pageMap
 * @returns {string[]}
 */
function getAncestorTitles(page, pageMap) {
  const ancestors = [];
  let current = page;
  let depth = 0;
  while (current.parentId && depth < 10) {
    const parent = pageMap.get(current.parentId);
    if (!parent) break;
    ancestors.unshift(parent.title);
    current = parent;
    depth++;
  }
  return ancestors;
}

/**
 * 제목/조상에서 팀 레이블 추출
 * @param {string} title
 * @param {string[]} ancestors
 * @returns {string}
 */
function detectTeam(title, ancestors) {
  const all = [title, ...ancestors].join(' ');
  if (/AI MPS|\bAI팀\b|AI\s*MPS/i.test(all)) return 'team:ai';
  if (/SW MPS|\bSW팀\b|SW\s*MPS/i.test(all)) return 'team:sw';
  if (/Device\s*MPS|\bDevice팀\b/i.test(all)) return 'team:device';
  if (/Solution\s*MPS|\bSolution팀\b/i.test(all)) return 'team:solution';
  if (/R&D\s*MPS|\bR&D팀\b/i.test(all)) return 'team:rnd';
  return 'team:center';
}

/**
 * MPS 문서 유형 레이블 추출
 * @param {string} title
 * @returns {string}
 */
function detectMpsDocType(title) {
  if (/연간/i.test(title)) return 'doctype:mps-annual';
  if (/월간/i.test(title)) return 'doctype:mps-monthly';
  if (/주간|Weekly/i.test(title)) return 'doctype:mps-weekly';
  return 'doctype:mps-monthly';
}

/**
 * 연도 추출
 * @param {string} title
 * @param {Date} fallbackDate
 * @returns {number}
 */
function detectYear(title, fallbackDate) {
  // 4자리 연도 전체를 파싱 (20xx 범위만 허용)
  const match = title.match(/(20[2-9]\d)/);
  if (match) return parseInt(match[1]);
  // 제목에서 연도 못 찾으면 최종 수정일 기준
  return fallbackDate.getFullYear();
}

// ─── 메인 실행 ────────────────────────────────────────────────────────────────

function main() {
  console.log('=== AA 스페이스 이관 후보 분석 시작 ===\n');

  // 모든 v2 JSON 데이터 로드
  const allPages = [];
  for (let i = 1; i <= 3; i++) {
    const filePath = path.join(RESULT_PATH, `sd_v2_p${i}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`파일 없음: ${filePath}`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    allPages.push(...(data.results || []));
  }
  console.log(`총 페이지 수: ${allPages.length}`);

  // 페이지 맵 생성 (id → page)
  const pageMap = new Map();
  allPages.forEach(p => pageMap.set(p.id, p));

  // 이관 후보 분류
  const categorized = {};
  const excluded = { archived: 0, tooOld: 0, dailyScrum: 0, weeklyDate: 0, other: 0 };
  const candidates = [];

  allPages.forEach(page => {
    // 기본 제외 처리
    if (page.status === 'archived') { excluded.archived++; return; }
    if (isDailyScrumPage(page.title)) { excluded.dailyScrum++; return; }
    if (isArchivedPage(page.title)) { excluded.archived++; return; }
    if (isWeeklyDateRecord(page.title)) { excluded.weeklyDate++; return; }

    const lastModified = new Date(page.version.createdAt);
    if (lastModified < CUTOFF_DATE) { excluded.tooOld++; return; }

    const result = classifyPage(page, pageMap);
    if (!result) { excluded.other++; return; }

    candidates.push({
      id: page.id,
      title: page.title,
      lastModified: lastModified.toISOString().split('T')[0],
      url: `https://neobiotech.atlassian.net/wiki${page._links.webui}`,
      ...result,
    });

    if (!categorized[result.category]) categorized[result.category] = {};
    if (!categorized[result.category][result.subCategory]) {
      categorized[result.category][result.subCategory] = [];
    }
    categorized[result.category][result.subCategory].push(candidates[candidates.length - 1]);
  });

  // ── 보고서 생성 ─────────────────────────────────────────────────────────────
  const lines = [];
  lines.push('# AA 스페이스 이관 후보 목록');
  lines.push('');
  lines.push(`> 분석일: ${new Date().toISOString().split('T')[0]} | 기준일: 2024-01-01 이후 수정`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 요약 통계');
  lines.push('');
  lines.push('| 항목 | 수치 |');
  lines.push('|------|------|');
  lines.push(`| SD 전체 페이지 | ${allPages.length}개 |`);
  lines.push(`| 이관 후보 | **${candidates.length}개** |`);
  lines.push(`| 이관 비율 | ${Math.round(candidates.length / allPages.length * 100)}% |`);
  lines.push(`| 제외: archived/상태 | ${excluded.archived}개 |`);
  lines.push(`| 제외: 2024년 이전 | ${excluded.tooOld}개 |`);
  lines.push(`| 제외: Daily Scrum | ${excluded.dailyScrum}개 |`);
  lines.push(`| 제외: 주간 날짜 기록 | ${excluded.weeklyDate}개 |`);
  lines.push(`| 제외: 기타 (분류 불가) | ${excluded.other}개 |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 카테고리별 출력
  let totalCandidates = 0;
  Object.entries(categorized).forEach(([category, subCategories]) => {
    const catTotal = Object.values(subCategories).flat().length;
    totalCandidates += catTotal;
    lines.push(`## ${category} (${catTotal}개)`);
    lines.push('');

    Object.entries(subCategories).forEach(([subCat, pages]) => {
      lines.push(`### ${subCat} (${pages.length}개)`);
      lines.push('');
      lines.push('| 제목 | 최종수정 | 이관사유 | 레이블 |');
      lines.push('|------|---------|---------|--------|');
      pages.forEach(p => {
        const labelStr = p.labels.join(', ');
        lines.push(`| [${p.title}](${p.url}) | ${p.lastModified} | ${p.reason} | ${labelStr} |`);
      });
      lines.push('');
    });
  });

  lines.push('---');
  lines.push('');
  lines.push('## 이관 제외 목록 (주요 항목)');
  lines.push('');
  lines.push('| 제외 사유 | 건수 |');
  lines.push('|----------|------|');
  lines.push(`| Archived 상태 페이지 | ${excluded.archived}개 |`);
  lines.push(`| 2024년 이전 고령 문서 | ${excluded.tooOld}개 |`);
  lines.push(`| Daily Scrum 기록 | ${excluded.dailyScrum}개 |`);
  lines.push(`| 주간 날짜 기록 (YYYY-MM-DD ~ YYYY-MM-DD) | ${excluded.weeklyDate}개 |`);
  lines.push(`| 분류 불가 (기타) | ${excluded.other}개 |`);
  lines.push('');
  lines.push(`*문서 위치: \`reference/migration_candidates.md\`*`);
  lines.push(`*관련 정책: [AA_space_design_plan.md](AA_space_design_plan.md)*`);

  const output = lines.join('\n');
  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

  console.log(`\n분석 완료!`);
  console.log(`이관 후보: ${candidates.length}개 / 전체: ${allPages.length}개`);
  console.log(`결과 저장: ${OUTPUT_FILE}`);
  Object.entries(categorized).forEach(([cat, subs]) => {
    const total = Object.values(subs).flat().length;
    console.log(`  - ${cat}: ${total}개`);
  });
}

main();
