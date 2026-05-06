const { fetchLeetCodeMetrics } = require('./src/lib/fetchers/leetcode.ts');
fetchLeetCodeMetrics('Sharan08').then(console.log).catch(console.error);
