'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const https = require('https');

const DIFY_API_URL = process.env.DIFY_API_URL; // e.g., 'https://api.dify.ai/v1/workflows/run'
const DIFY_API_KEY = process.env.DIFY_API_KEY;

/**
 * 페이지 텍스트와 현재 폴더 트리를 Dify API(Workflow)로 전송하여 타겟 폴더 및 레이블을 추론받습니다.
 * @param {string} pageTitle 페이지 제목
 * @param {string} pageBody 페이지 본문 (텍스트 또는 마크다운)
 * @param {string} contextTree 실시간 AA 스페이스 트리 구조 (텍스트)
 * @returns {Promise<Object>} { is_valid, target_folder_id, labels, needs_new_category, suggested_new_folder, reason }
 */
async function getPageClassificationFromDify(pageTitle, pageBody, contextTree) {
  if (!DIFY_API_URL || !DIFY_API_KEY) {
    console.warn('⚠️ DIFY_API_URL or DIFY_API_KEY is not set. Using mock response.');
    // Mock response for testing without Dify
    return {
      is_valid: true,
      target_folder_id: "433356856", // Mock: 연간 MPS 폴더
      labels: ["group-center", "doctype-mps-annual", "year-2026"],
      needs_new_category: false
    };
  }

  return new Promise((resolve, reject) => {
    const url = new URL(DIFY_API_URL);
    
    // Dify Workflow 실행 요청 본문 구성
    const body = JSON.stringify({
      inputs: {
        page_title: pageTitle,
        page_body: pageBody.substring(0, 10000), // 너무 길면 자르기
        context_tree: contextTree
      },
      response_mode: 'blocking',
      user: 'confluence-bot'
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            // Dify 워크플로우의 반환값이 data.outputs.result 에 JSON string으로 온다고 가정
            const resultJson = JSON.parse(parsed.data.outputs.result);
            resolve(resultJson);
          } catch (e) {
            reject(new Error(`Failed to parse Dify response: ${e.message}\nRaw: ${data}`));
          }
        } else {
          reject(new Error(`Dify API Error [${res.statusCode}]: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { getPageClassificationFromDify };
