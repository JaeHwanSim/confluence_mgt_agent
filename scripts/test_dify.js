'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { fetchAASpaceTreeText } = require('./utils/confluence_api');
const { getPageClassificationFromDify } = require('./utils/dify_api');

async function testDifyAPI() {
  console.log('1. 동적 컨텍스트(AA 스페이스 트리) 수집 중...');
  const contextTree = await fetchAASpaceTreeText();
  if (!contextTree) {
    console.error('컨텍스트 트리를 가져오지 못했습니다.');
    return;
  }
  console.log(`\n[컨텍스트 트리 일부]\n${contextTree.substring(0, 300)}...\n`);

  // 샘플 데이터 생성
  const sampleTitle = "2026년 7월 2주차 AI 비전 인식 성능 개선 주간 보고";
  const sampleBody = `
    <h1>주간 업무 보고 (2026-07-10)</h1>
    <p>이번 주에는 치과용 로봇 팔의 AI 비전 인식 모델(YOLO) 파인튜닝을 진행했습니다.</p>
    <p>기존 대비 마커 인식률이 15% 상승했으며, 다음 주에는 실제 덴티폼 환경에서 테스트할 예정입니다.</p>
    <p>관련 지표는 별첨 자료를 참고하세요.</p>
  `;

  console.log('2. Dify API로 분류 요청 전송 중...');
  console.log(`- 제목: ${sampleTitle}`);
  
  try {
    const result = await getPageClassificationFromDify(sampleTitle, sampleBody, contextTree);
    console.log('\n✅ [Dify LLM 분류 결과 (JSON)]');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Dify API 테스트 실패:', error.message);
  }
}

testDifyAPI();
