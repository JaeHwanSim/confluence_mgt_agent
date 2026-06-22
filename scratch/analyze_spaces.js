'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { confluenceRequest } = require('../scripts/utils/confluence_api');
const { getLabels } = require('../scripts/utils/migration_utils');

const spaces = ['SD', 'WND', 'Device', 'SmileArch'];

async function analyzeSpaces() {
  for (const space of spaces) {
    console.log(`\n=== Analyzing Space: ${space} ===`);
    const cql = encodeURIComponent(`space="${space}" AND type="page" order by lastmodified desc`);
    const searchUrl = `/wiki/rest/api/content/search?cql=${cql}&limit=10&expand=metadata.labels`;
    
    try {
      const res = await confluenceRequest('GET', searchUrl);
      const candidates = res.results || [];
      if (candidates.length === 0) {
        console.log(`No pages found in ${space}.`);
        continue;
      }
      
      for (const page of candidates) {
        const title = page.title;
        // In v1 API with expand=metadata.labels, labels are under metadata.labels.results
        const labels = page.metadata?.labels?.results?.map(l => l.name) || [];
        console.log(`- [${title}] | Tags: [${labels.join(', ')}]`);
      }
    } catch (e) {
      console.error(`Error fetching ${space}:`, e.message);
    }
  }
}

analyzeSpaces();
