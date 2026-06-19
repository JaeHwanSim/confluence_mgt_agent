'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { confluenceRequest, fetchAASpaceTreeText } = require('./utils/confluence_api');
const { getPageClassificationFromDify } = require('./utils/dify_api');
const { getLabels, syncLabels, movePage } = require('./utils/migration_utils');

const AA_SPACE_KEY = 'AA';
const delay = ms => new Promise(res => setTimeout(res, ms));

async function runAuditor() {
  console.log(`🧹 [Auditor] AA 스페이스 자가 정화(Self-Healing) 작업을 시작합니다.`);

  console.log('📡 [1/3] AA 스페이스의 최신 폴더 구조(context_tree)를 수집합니다...');
  const contextTree = await fetchAASpaceTreeText();
  if (!contextTree) return console.error('❌ 컨텍스트 트리를 가져오지 못했습니다.');

  console.log(`📡 [2/3] AA 스페이스에서 최근 수정된 문서를 검색합니다...`);
  const cql = encodeURIComponent(`space="${AA_SPACE_KEY}" AND type="page" order by lastmodified desc`);
  const searchUrl = `/wiki/rest/api/content/search?cql=${cql}&limit=20&expand=body.storage,ancestors`;
  
  let candidates;
  try {
    const res = await confluenceRequest('GET', searchUrl);
    candidates = res.results || [];
    console.log(`✅ 최근 수정된 ${candidates.length}개의 페이지를 점검합니다.`);
  } catch (e) {
    return console.error('❌ 검색 실패:', e.message);
  }

  console.log('📡 [3/3] 문서 감사 및 교정(Self-Healing) 시작...');
  for (const page of candidates) {
    console.log(`\n--------------------------------------------------`);
    console.log(`📄 감사 중: [${page.title}] (ID: ${page.id})`);

    const currentLabels = await getLabels(page.id);
    if (currentLabels.includes('is-folder')) {
      console.log(`⏭️ [스킵] 폴더(컨테이너) 페이지입니다.`);
      continue;
    }

    const parentId = page.ancestors && page.ancestors.length > 0 
                     ? page.ancestors[page.ancestors.length - 1].id : null;
    const pageBody = page.body?.storage?.value || '';
    const truncatedBody = pageBody.substring(0, 20000);

    try {
      const decision = await getPageClassificationFromDify(page.title, truncatedBody, contextTree);
      
      if (decision.needs_new_category) {
        console.log(`🚨 [알림] 새로운 폴더가 필요한 문서입니다. (제안: ${decision.suggested_new_folder})`);
        // TODO: Slack Webhook 등 알림 전송 로직 연동
        continue;
      }

      if (!decision.is_valid) {
        console.log(`⚠️ [경고] 노이즈로 판별된 문서가 AA 스페이스에 있습니다! 관리자 확인이 필요합니다.`);
        continue;
      }

      if (!decision.target_folder_id) {
        console.log(`⏭️ [스킵] 분류 가능한 폴더 ID가 없습니다.`);
        continue;
      }

      let healed = false;

      // 1. 위치 검증 및 교정
      if (parentId !== decision.target_folder_id) {
        console.log(`   🔄 [위치 교정] 현재 부모(${parentId}) -> 올바른 부모(${decision.target_folder_id})로 이동합니다.`);
        await movePage(page.id, decision.target_folder_id);
        healed = true;
      } else {
        console.log(`   ✅ [위치 정상] 올바른 폴더에 위치해 있습니다.`);
      }

      // 2. 레이블 검증 및 교정
      const { added, removed } = await syncLabels(page.id, decision.labels);
      if (added.length > 0 || removed.length > 0) {
        console.log(`   🏷️ [태그 교정] 추가: [${added.join(', ')}], 제거: [${removed.join(', ')}]`);
        healed = true;
      } else {
        console.log(`   ✅ [태그 정상] 레이블이 완벽하게 일치합니다.`);
      }

      if (healed) {
        console.log(`✨ [완료] [${page.title}] 문서의 자가 치유(Self-Healing)를 완료했습니다.`);
      }

    } catch (e) {
      console.error(`❌ [오류] 처리 중 에러:`, e.message);
    }
    
    await delay(1500); // Rate limit 보호
  }
  console.log(`\n🎉 [Auditor] 모든 감사 및 정화 작업이 완료되었습니다!`);
}

runAuditor();
