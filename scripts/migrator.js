'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
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

const AA_SPACE_KEY = 'AA';

// API Rate Limit 방지를 위한 대기 함수
const delay = ms => new Promise(res => setTimeout(res, ms));

async function runMigrator() {
  console.log(`🚀 [Migrator] 다중 스페이스 이관 작업을 시작합니다.`);

  // 1. spaces_config.json 로드
  const configPath = path.join(__dirname, '..', 'spaces_config.json');
  if (!fs.existsSync(configPath)) {
    return console.error('❌ spaces_config.json 파일이 없습니다.');
  }
  const spacesConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const activeSpaces = Object.keys(spacesConfig).filter(key => spacesConfig[key].active);

  if (activeSpaces.length === 0) {
    return console.log('⏭️ 활성화된 수집 대상 스페이스가 없습니다.');
  }

  console.log('📡 [1/3] AA 스페이스의 최신 폴더 구조(context_tree)를 수집합니다...');
  const contextTree = await fetchAASpaceTreeText();
  if (!contextTree) return console.error('❌ 컨텍스트 트리를 가져오지 못해 작업을 중단합니다.');
  console.log('✅ 컨텍스트 트리 수집 완료.\n');

  // 2. 활성화된 스페이스 순회
  for (const sourceSpace of activeSpaces) {
    console.log(`==================================================`);
    console.log(`📂 대상 스페이스: ${sourceSpace}`);
    console.log(`📡 [2/3] ${sourceSpace} 스페이스에서 최근 수정된 문서를 검색합니다...`);
    
    const cql = encodeURIComponent(`space="${sourceSpace}" AND type="page" order by lastmodified desc`);
    const searchUrl = `/wiki/rest/api/content/search?cql=${cql}&limit=10&expand=body.storage`;
    
    let candidates;
    try {
      const res = await confluenceRequest('GET', searchUrl);
      candidates = res.results || [];
      console.log(`✅ 총 ${candidates.length}개의 후보 문서를 발견했습니다.`);
    } catch (e) {
      console.error(`❌ ${sourceSpace} 후보 문서 검색 실패:`, e.message);
      continue;
    }

    if (candidates.length === 0) continue;

    console.log(`📡 [3/3] Dify LLM 분석 및 이관을 시작합니다...`);
    for (const page of candidates) {
      console.log(`\n--------------------------------------------------`);
      console.log(`📄 분석 중: [${page.title}] (ID: ${page.id})`);
      
      const pageBody = page.body?.storage?.value || '';
      const truncatedBody = pageBody.substring(0, 20000);

      try {
        const decision = await getPageClassificationFromDify(page.title, truncatedBody, contextTree, sourceSpace);
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
        const srcMeta = await fetchPageDetail(page.id);
        
        console.log(`✨ [복사 진행] 새 페이지 껍데기 생성 중...`);
        const newPage = await createPage(AA_SPACE_KEY, decision.target_folder_id, srcMeta.title, '<p>복사 중...</p>');
        
        console.log(`✨ [복사 진행] 첨부파일 복사 중...`);
        const { skippedVideos } = await copyAttachments(page.id, newPage.id);

        console.log(`✨ [복사 진행] 본문 변환 및 배너 삽입 중...`);
        const bannerHtml = buildBanner({
          sourcePageUrl: srcMeta.url,
          sourcePageTitle: srcMeta.title,
          authorDisplayName: srcMeta.authorDisplayName,
          originalCreatedAt: srcMeta.createdAt,
          labels: decision.labels
        }, skippedVideos);

        let newBody = fixBodyReferences(srcMeta.body, page.id, newPage.id);
        newBody = bannerHtml + newBody;
        await updatePageBody(newPage.id, newPage.title, newBody);

        console.log(`✨ [복사 진행] 레이블 부착 중...`);
        if (decision.labels && decision.labels.length > 0) {
          await addLabels(newPage.id, decision.labels);
        }

        console.log(`✅ 이관 성공: ${newPage.webUrl}`);
      } catch (e) {
        console.error(`❌ [오류] '${page.title}' 처리 중 에러 발생:`, e.message);
      }
      
      await delay(1500);
    }
  }
  
  console.log(`\n🎉 [Migrator] 모든 작업이 완료되었습니다!`);
}

runMigrator();
