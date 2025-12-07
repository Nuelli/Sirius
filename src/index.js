import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const res = new Resolver();

res.define('getConfig', async () => {
  return await storage.get('testrailConfig') || {};
});

res.define('saveConfig', async ({ payload }) => {
  const config = payload;
  if (!config.testrailUser || !config.testrailToken || !config.testrailSite || !config.coverageFieldId || !config.passRateFieldId) {
    throw new Error('All configuration fields are required');
  }
  try {
    new URL(config.testrailSite);
  } catch {
    throw new Error('Invalid TestRail site URL');
  }
  await storage.set('testrailConfig', config);
  return { success: true };
});

export const handler = res.getDefinitions();
