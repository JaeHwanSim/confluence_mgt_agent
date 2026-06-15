const fs = require('fs');
const path = require('path');

const allResults = [];
const basePath = 'f:/work/private_git/confluence_mgt_agent/reference';
for (let i = 1; i <= 4; i++) {
  const filePath = path.join(basePath, 'sd_p' + i + '.json');
  const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  allResults.push(...d.results);
}

const pageMap = {};
allResults.forEach(p => {
  pageMap[p.id] = {
    id: p.id,
    title: p.title,
    type: p.type,
    parentId: p.ancestors && p.ancestors.length > 0 ? p.ancestors[p.ancestors.length - 1].id : null,
    ancestorIds: (p.ancestors || []).map(a => a.id),
    depth: p.ancestors ? p.ancestors.length : 0,
    labels: (p.labels?.results || []).map(l => l.name),
    version: p.version?.when || null,
    body: p.body?.storage?.value?.substring(0, 200) || ''
  };
});

// Find root pages and their trees
const rootPages = Object.values(pageMap).filter(p => !p.parentId);

console.log('=== 전체 트리 구조 (깊이 무제한) ===\n');

function printFullTree(parentId, indent, maxDepth) {
  if (indent.length / 3 > maxDepth) return;
  const children = Object.values(pageMap)
    .filter(p => p.parentId === parentId)
    .sort((a,b) => a.title.localeCompare(b.title));
  children.forEach((p, idx) => {
    const isLast = idx === children.length - 1;
    const connector = isLast ? '└─ ' : '├─ ';
    const childCount = Object.values(pageMap).filter(x => x.parentId === p.id).length;
    const suffix = childCount > 0 ? ' (' + childCount + ')' : '';
    console.log(indent + connector + p.title + suffix);
    printFullTree(p.id, indent + (isLast ? '   ' : '│  '), maxDepth);
  });
}

rootPages.forEach(p => {
  const childCount = Object.values(pageMap).filter(x => x.parentId === p.id).length;
  console.log('📁 ' + p.title + ' [' + p.id + '] (' + childCount + '개 하위)');
  printFullTree(p.id, '', 10);
  console.log();
});

// Analyze "Neo Robot-Guided Dental Implant Surgery" subtree specifically
console.log('\n=== Neo Robot-Guided Dental Implant Surgery 상세 분석 ===\n');
const neoRoot = Object.values(pageMap).find(p => p.title === 'Neo Robot-Guided Dental Implant Surgery');
if (neoRoot) {
  // Find all descendants
  function getAllDescendants(parentId) {
    const children = Object.values(pageMap).filter(p => p.parentId === parentId);
    let result = [...children];
    children.forEach(c => {
      result = result.concat(getAllDescendants(c.id));
    });
    return result;
  }
  const descendants = getAllDescendants(neoRoot.id);
  console.log('총 하위 페이지 수:', descendants.length);

  // Group by depth 2 children
  const d2Children = descendants.filter(p => p.depth === neoRoot.depth + 1);
  console.log('\n1단계 하위 (' + d2Children.length + '개):');
  d2Children.forEach(p => {
    const sub = getAllDescendants(p.id);
    console.log('  ' + p.title + ' [' + sub.length + '개 하위]');
  });

  // Category analysis
  console.log('\n카테고리별 분석:');
  const categories = {};
  d2Children.forEach(p => {
    categories[p.title] = getAllDescendants(p.id).length + 1;
  });
  Object.entries(categories).sort((a,b) => b[1] - a[1]).forEach(([name, count]) => {
    console.log('  ' + name + ': ' + count + '개');
  });
}

// Analyze orphan pages
console.log('\n\n=== 고아 페이지 분석 ===\n');
const orphans = Object.values(pageMap).filter(p => p.parentId && !pageMap[p.parentId]);
console.log('고아 페이지 수:', orphans.length);

// Group orphans by their parentId (missing parent)
const orphanGroups = {};
orphans.forEach(p => {
  if (!orphanGroups[p.parentId]) orphanGroups[p.parentId] = [];
  orphanGroups[p.parentId].push(p);
});

console.log('\n고아 페이지의 부모 ID별 그룹:');
Object.entries(orphanGroups)
  .sort((a,b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([parentId, pages]) => {
    console.log('  parentId=' + parentId + ': ' + pages.length + '개 페이지');
    pages.slice(0, 3).forEach(p => {
      console.log('    - ' + p.title + ' (depth:' + p.depth + ')');
    });
    if (pages.length > 3) console.log('    ... 외 ' + (pages.length - 3) + '개');
  });

// Check pages with "MPS" in title
console.log('\n\n=== MPS 관련 페이지 ===\n');
const mpsPages = Object.values(pageMap).filter(p => /mps/i.test(p.title));
mpsPages.forEach(p => {
  const parent = pageMap[p.parentId];
  const parentTitle = parent ? parent.title : '(missing:' + p.parentId + ')';
  console.log('  ' + p.title);
  console.log('    parent: ' + parentTitle + ', depth: ' + p.depth + ', labels: [' + p.labels.join(', ') + ']');
});

// Check pages with "Evaluation" or "Planning" in title
console.log('\n\n=== Evaluation/Planning 관련 페이지 ===\n');
const evalPlanPages = Object.values(pageMap).filter(p => /evaluation|planning|평가|계획/i.test(p.title));
evalPlanPages.forEach(p => {
  const parent = pageMap[p.parentId];
  const parentTitle = parent ? parent.title : '(missing:' + p.parentId + ')';
  console.log('  ' + p.title);
  console.log('    parent: ' + parentTitle + ', depth: ' + p.depth);
});
