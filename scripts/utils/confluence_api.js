'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const https = require('https');

const BASE_URL = 'https://neobiotech.atlassian.net';
const EMAIL = process.env.CONFLUENCE_EMAIL;
const TOKEN = process.env.CONFLUENCE_TOKEN;
const AUTH_HEADER = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`;

/**
 * Confluence API 요청 공통 유틸리티
 */
async function confluenceRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: AUTH_HEADER,
        Accept: 'application/json',
      },
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`API Error [${res.statusCode}] ${endpoint}\n${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * AA 스페이스의 최신 폴더 트리 구조(ID 및 Title)를 재귀적으로 가져와 텍스트 포맷으로 반환
 */
async function fetchAASpaceTreeText() {
  try {
    // AA 스페이스 내 모든 페이지 수집 (100개 제한 시 페이징 처리 필요할 수 있으나 현재는 단일 호출)
    const spaces = await confluenceRequest('GET', '/wiki/api/v2/spaces?keys=AA');
    if (!spaces.results || spaces.results.length === 0) return '';
    const spaceId = spaces.results[0].id;

    const pages = await confluenceRequest('GET', `/wiki/api/v2/spaces/${spaceId}/pages?limit=150`);
    const pageList = pages.results || [];
    
    // 부모-자식 트리 구성
    const childrenMap = {};
    const rootNodes = [];
    
    pageList.forEach(p => {
      if (!p.parentId) {
        rootNodes.push(p);
      } else {
        if (!childrenMap[p.parentId]) childrenMap[p.parentId] = [];
        childrenMap[p.parentId].push(p);
      }
    });

    let treeText = '--- AA Space Folder IDs ---\n';
    function printTree(node, depth = 0) {
      const indent = '  '.repeat(depth);
      treeText += `${indent}- ${node.title} (ID: ${node.id})\n`;
      const children = childrenMap[node.id] || [];
      children.forEach(c => printTree(c, depth + 1));
    }

    rootNodes.forEach(root => printTree(root));
    return treeText;

  } catch (error) {
    console.error('Failed to fetch AA Space Tree:', error.message);
    return '';
  }
}

module.exports = {
  BASE_URL,
  AUTH_HEADER,
  confluenceRequest,
  fetchAASpaceTreeText
};
