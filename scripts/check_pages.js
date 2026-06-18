require('dotenv').config();
const { confluenceRequest } = require('./utils/confluence_api');
async function check() {
  const s = await confluenceRequest('GET', '/wiki/api/v2/spaces?keys=AA');
  const p = await confluenceRequest('GET', `/wiki/api/v2/spaces/${s.results[0].id}/pages?limit=200`);
  console.log('AA Space Total Pages:', p.results.length);
  // console.log(p.results.map(x=>x.title).join(', '));
}
check();
