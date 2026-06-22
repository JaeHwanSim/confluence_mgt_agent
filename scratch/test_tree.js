'use strict';
require('dotenv').config();
const { fetchAASpaceTreeText } = require('../scripts/utils/confluence_api');

async function test() {
  console.log('=== context_tree 빌딩 테스트 ===');
  const tree = await fetchAASpaceTreeText();
  console.log(tree);
  const lines = tree.split('\n').filter(l => l.trim());
  console.log(`\n총 ${lines.length - 1}개의 폴더 항목이 트리에 포함됨`);
}

test().catch(console.error);
