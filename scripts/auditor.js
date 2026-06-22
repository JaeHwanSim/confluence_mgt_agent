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

  // 날짜 기반 룩백 기간 계산
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, '..', 'spaces_config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const lookbackDays = config.LOOKBACK_DAYS || 7;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - lookbackDays);
  const sinceDateStr = sinceDate.toISOString().split('T')[0];
  console.log(`📅 감사 기준: 최근 ${lookbackDays}일 (${sinceDateStr} 이후 수정된 문서대상)`);

  const cql = encodeURIComponent(`space="${AA_SPACE_KEY}" AND type="page" AND lastmodified >= "${sinceDateStr}" order by lastmodified desc`);
  const searchUrl = `/wiki/rest/api/content/search?cql=${cql}&limit=200&expand=body.storage,ancestors`;
  
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

    // 본문 상단 배너에서 원본 스페이스 역추출 (배너가 없을 경우 기본값 SD)
    let inferredSourceSpace = 'SD';
    const spaceMatch = truncatedBody.match(/원본 스페이스<\/strong><\/td><td>([^<]+)/);
    if (spaceMatch) {
      inferredSourceSpace = spaceMatch[1].trim();
    }

    // 본문 상단 배너에서 원본 작성일 역추출
    let pageDate = '';
    const dateMatch = truncatedBody.match(/원본 작성일<\/strong><\/td><td>([\d-]+)/);
    if (dateMatch) {
      pageDate = dateMatch[1].trim();
    }

    // 0원 필터링: 룰 버전 및 문서 버전 교차 검증
    const config = require('../spaces_config.json');
    const systemRuleVersion = config.GLOBAL_RULE_VERSION || '1.0';
    const currentPageVersion = String(page.version?.number || '1');

    let bannerRuleVersion = '';
    const rvMatch = truncatedBody.match(/적용된 룰 버전<\/strong><\/td><td>([^<]+)/);
    if (rvMatch) bannerRuleVersion = rvMatch[1].trim();

    let bannerPageVersion = '';
    const pvMatch = truncatedBody.match(/마지막 감사 버전\(Page\)<\/strong><\/td><td>([^<]+)/);
    if (pvMatch) bannerPageVersion = pvMatch[1].trim();

    if (bannerRuleVersion === systemRuleVersion && bannerPageVersion === currentPageVersion) {
      console.log(`   ⏭️ [스킵] 문서(v${currentPageVersion})와 룰(v${systemRuleVersion})이 모두 최신 상태입니다. (LLM 비용 0)`);
      continue;
    }

    try {
      const decision = await getPageClassificationFromDify(page.title, truncatedBody, contextTree, inferredSourceSpace, pageDate);
      
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
      const { syncLabels } = require('./utils/migration_utils');
      const { added, removed } = await syncLabels(page.id, decision.labels);
      if (added.length > 0 || removed.length > 0) {
        console.log(`   🏷️ [태그 교정] 추가: [${added.join(', ')}], 제거: [${removed.join(', ')}]`);
        healed = true;
      } else {
        console.log(`   ✅ [태그 정상] 레이블이 완벽하게 일치합니다.`);
      }

      // 3. 배너 버전 갱신 (0원 필터링용)
      if (healed || bannerRuleVersion !== systemRuleVersion || bannerPageVersion !== currentPageVersion) {
        // updatePageBody를 호출하면 Confluence의 페이지 버전이 1 증가하므로 이를 미리 예측하여 각인합니다.
        const targetPageVersion = String(parseInt(currentPageVersion) + 1);
        let newBody = pageBody;
        
        if (newBody.includes('적용된 룰 버전')) {
          newBody = newBody.replace(/<td><strong>적용된 룰 버전<\/strong><\/td><td>([^<]+)<\/td>/, `<td><strong>적용된 룰 버전</strong></td><td>${systemRuleVersion}</td>`);
          newBody = newBody.replace(/<td><strong>마지막 감사 버전\(Page\)<\/strong><\/td><td>([^<]+)<\/td>/, `<td><strong>마지막 감사 버전(Page)</strong></td><td>${targetPageVersion}</td>`);
        } else {
          // 기존 배너에 항목이 없다면 강제 삽입 (호환성)
          newBody = newBody.replace(/<tr><td><strong>원본 스페이스<\/strong>/, `<tr><td><strong>적용된 룰 버전</strong></td><td>${systemRuleVersion}</td></tr><tr><td><strong>마지막 감사 버전(Page)</strong></td><td>${targetPageVersion}</td></tr><tr><td><strong>원본 스페이스</strong>`);
        }

        console.log(`   📝 [배너 갱신] 적용된 룰 버전: v${systemRuleVersion}, 마지막 감사 버전: v${targetPageVersion}`);
        const { updatePageBody } = require('./utils/migration_utils');
        await updatePageBody(page.id, page.title, newBody);
        healed = true;
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
