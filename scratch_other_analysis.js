const fs = require('fs');
const path = require('path');
const RESULT_PATH = path.join('scripts', 'result_json');
const allPages = [];
for (let i = 1; i <= 3; i++) {
  const filePath = path.join(RESULT_PATH, `sd_v2_p${i}.json`);
  if (!fs.existsSync(filePath)) continue;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  allPages.push(...(data.results || []));
}

// 부모 경로 구하기 로직
const pageMap = new Map();
allPages.forEach(p => pageMap.set(p.id, p));

function getPathToRoot(pageId) {
  const pathArr = [];
  let currentId = pageId;
  const seen = new Set();
  
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const p = pageMap.get(currentId);
    if (!p) break;
    pathArr.unshift(p.title);
    currentId = p.parentId;
  }
  return pathArr.length > 1 ? pathArr.slice(0, -1).join(' > ') : 'Root';
}

// 추출 로직 (migration_candidates.md 파싱)
const mdPath = path.join('reference', 'migration_candidates.md');
const content = fs.readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const validIds = new Set();
const idRegex = /\/pages\/(\d+)/g;
let match;
while ((match = idRegex.exec(content)) !== null) {
  validIds.add(match[1]);
}

const others = [];
allPages.forEach(p => {
  if (p.status === 'archived') return;
  if (validIds.has(p.id)) return;
  
  if (p.title.includes('Daily Scrum') || p.title.includes('스럼') || p.title.includes('데일리')) return;
  if (p.title.match(/\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}/)) return;
  
  others.push(p);
});

const grouped = {};
others.forEach(p => {
  const folder = getPathToRoot(p.id);
  if (!grouped[folder]) grouped[folder] = [];
  grouped[folder].push(p.title);
});

const sortedFolders = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

let report = '# 분류 불가 (기타) 페이지 분석 결과\n\n';
report += '총 ' + others.length + '개의 페이지가 다음 폴더들에 위치해 있습니다.\n\n';

sortedFolders.forEach(([folder, pages]) => {
  report += `## 📁 ${folder} (${pages.length}개)\n`;
  const displayPages = pages.slice(0, 15);
  displayPages.forEach(title => {
    report += `- ${title}\n`;
  });
  if (pages.length > 15) {
    report += `- ... 외 ${pages.length - 15}개\n`;
  }
  report += '\n';
});

fs.writeFileSync('other_pages_analysis.md', report);
console.log('Saved to other_pages_analysis.md');
