'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { confluenceRequest, fetchAASpaceTreeText } = require('./utils/confluence_api');
const { getPageClassificationFromDify } = require('./utils/dify_api');

const { 
  fetchPageDetail, 
  createPage, 
  updatePageBody, 
  addLabels, 
  copyAttachments, 
  buildBanner, 
  fixBodyReferences 
} = require('./utils/migration_utils');

const SOURCE_SPACE_KEY = 'SD'; // 수집 대상 스페이스
const AA_SPACE_KEY = 'AA';

// API Rate Limit 방지를 위한 대기 함수
const delay = ms => new Promise(res => setTimeout(res, ms));

async function runMigrator() {
  console.log(`🚀 [Migrator] 작업을 시작합니다. 대상 스페이스: ${SOURCE_SPACE_KEY}`);

  console.log('📡 [1/3] AA 스페이스의 최신 폴더 구조(context_tree)를 수집합니다...');
  const contextTree = await fetchAASpaceTreeText();
  if (!contextTree) return console.error('❌ 컨텍스트 트리를 가져오지 못해 작업을 중단합니다.');
  console.log('✅ 컨텍스트 트리 수집 완료.');

  console.log(`📡 [2/3] ${SOURCE_SPACE_KEY} 스페이스에서 최근 수정된 문서를 검색합니다...`);
  const cql = encodeURIComponent(`space="${SOURCE_SPACE_KEY}" AND type="page" order by lastmodified desc`);
  const searchUrl = `/wiki/rest/api/content/search?cql=${cql}&limit=10&expand=body.storage`;
  
  let candidates;
  try {
    const res = await confluenceRequest('GET', searchUrl);
    candidates = res.results || [];
    console.log(`✅ 총 ${candidates.length}개의 후보 문서를 발견했습니다.`);
  } catch (e) {
    return console.error('❌ 후보 문서 검색 실패:', e.message);
  }

  console.log('📡 [3/3] Dify LLM 분석 및 이관을 시작합니다...');
  for (const page of candidates) {
    console.log(`\n--------------------------------------------------`);
    console.log(`📄 분석 중: [${page.title}] (ID: ${page.id})`);
    
    const pageTitle = page.title;
    const pageBody = page.body && page.body.storage ? page.body.storage.value : '';

    try {
      const truncatedBody = pageBody.substring(0, 20000);
      const decision = await getPageClassificationFromDify(pageTitle, truncatedBody, contextTree);
      
      console.log(`🤖 Dify 판단: 유효성(${decision.is_valid}) | 목적지(${decision.target_folder_id})`);
      
      if (decision.needs_new_category) {
        console.log(`🚨 [예외] 적절한 폴더가 없습니다! 제안: ${decision.suggested_new_folder} / 사유: ${decision.reason}`);
        continue;
      }
      if (!decision.is_valid || !decision.target_folder_id) {
        console.log(`⏭️ [스킵] 유효하지 않거나 타겟 폴더가 없습니다.`);
        continue;
      }

      console.log(`✨ [복사 진행] 원본 페이지 세부 정보 조회 중...`);
      const detail = await fetchPageDetail(page.id);
      
      console.log(`✨ [복사 진행] 새 페이지 껍데기 생성 중...`);
      const newPage = await createPage(
        await getSpaceId(AA_SPACE_KEY), // 스페이스 ID 필요
        decision.target_folder_id, 
        pageTitle, 
        '<p>이관 중입니다...</p>'
      );

      console.log(`✨ [복사 진행] 첨부파일 복사 중...`);
      const { skippedVideos } = await copyAttachments(page.id, newPage.id);

      console.log(`✨ [복사 진행] 본문 변환 및 배너 삽입 중...`);
      let newBody = fixBodyReferences(detail.body, page.id, newPage.id);
      const banner = buildBanner({
        sourcePageUrl: detail.url,
        sourcePageTitle: pageTitle,
        authorDisplayName: detail.authorDisplayName,
        originalCreatedAt: detail.createdAt,
        labels: decision.labels
      }, skippedVideos);
      
      newBody = banner + newBody;
      await updatePageBody(newPage.id, pageTitle, newBody);

      console.log(`✨ [복사 진행] 레이블 부착 중...`);
      await addLabels(newPage.id, decision.labels);

      console.log(`✅ 이관 성공: ${newPage.webUrl}`);

    } catch (e) {
      console.error(`❌ [오류] '${pageTitle}' 처리 중 에러 발생:`, e.message);
    }
    await delay(1000);
  }
  console.log(`\n🎉 [Migrator] 모든 작업이 완료되었습니다!`);
}

async function getSpaceId(spaceKey) {
  const data = await confluenceRequest('GET', `/wiki/api/v2/spaces?keys=${spaceKey}`);
  return data.results[0].id;
}

runMigrator();
