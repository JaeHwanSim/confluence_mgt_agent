'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { confluenceRequest } = require('./utils/confluence_api');
const { getLabels, addLabels, deleteLabel } = require('./utils/migration_utils');

const AA_SPACE_KEY = 'AA';

// 사용법: node batch_utility.js rename "old-label" "new-label"
//         node batch_utility.js delete "target-label"

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

async function runBatch() {
  if (!command) {
    console.log('사용법:');
    console.log('  node scripts/batch_utility.js rename <old-label> <new-label>');
    console.log('  node scripts/batch_utility.js delete <target-label>');
    return;
  }

  console.log(`🔧 [Batch Utility] 스페이스: ${AA_SPACE_KEY}`);
  console.log(`명령: ${command} | 인자: ${arg1} ${arg2 || ''}\n`);

  const spaces = await confluenceRequest('GET', `/wiki/api/v2/spaces?keys=${AA_SPACE_KEY}`);
  if (!spaces.results || spaces.results.length === 0) return console.log('AA 스페이스를 찾을 수 없습니다.');
  const spaceId = spaces.results[0].id;

  // 전체 페이지를 가져오기 (실제 운영 시에는 페이징 처리 필요)
  const pages = await confluenceRequest('GET', `/wiki/api/v2/spaces/${spaceId}/pages?limit=250`);
  const pageList = pages.results || [];

  let count = 0;

  for (const page of pageList) {
    const labels = await getLabels(page.id);
    
    if (command === 'rename' && arg1 && arg2) {
      if (labels.includes(arg1)) {
        process.stdout.write(`- [${page.title}] ${arg1} -> ${arg2} 변경 중... `);
        await deleteLabel(page.id, arg1);
        await addLabels(page.id, [arg2]);
        console.log('✅');
        count++;
      }
    } 
    else if (command === 'delete' && arg1) {
      if (labels.includes(arg1)) {
        process.stdout.write(`- [${page.title}] ${arg1} 삭제 중... `);
        await deleteLabel(page.id, arg1);
        console.log('✅');
        count++;
      }
    }
  }

  console.log(`\n🎉 완료! 총 ${count}개의 페이지가 변경되었습니다.`);
}

runBatch();
