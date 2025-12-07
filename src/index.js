import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const res = new Resolver();

res.define('getConfig', async () => {
  return await storage.get('testrailConfig') || {};
});

res.define('saveConfig', async (req) => {
  const { payload } = req;
  console.log('saveConfig called with payload:', JSON.stringify(payload));
  console.log('Payload type:', typeof payload);
  console.log('Payload keys:', Object.keys(payload));
  
  // The payload is the config object
  const config = payload;
  console.log('Config object:', JSON.stringify(config));
  console.log('Config keys:', Object.keys(config));
  console.log('testrailUser:', config.testrailUser, 'type:', typeof config.testrailUser);
  console.log('testrailToken:', config.testrailToken, 'type:', typeof config.testrailToken);
  console.log('testrailSite:', config.testrailSite, 'type:', typeof config.testrailSite);
  console.log('coverageFieldId:', config.coverageFieldId, 'type:', typeof config.coverageFieldId);
  console.log('passRateFieldId:', config.passRateFieldId, 'type:', typeof config.passRateFieldId);
  
  // Validate each field individually
  if (!config.testrailUser) {
    console.error('testrailUser is missing or empty');
    throw new Error('TestRail username is required');
  }
  if (!config.testrailToken) {
    console.error('testrailToken is missing or empty');
    throw new Error('TestRail API token is required');
  }
  if (!config.testrailSite) {
    console.error('testrailSite is missing or empty');
    throw new Error('TestRail site URL is required');
  }
  if (!config.coverageFieldId) {
    console.error('coverageFieldId is missing or empty');
    throw new Error('Coverage field ID is required');
  }
  if (!config.passRateFieldId) {
    console.error('passRateFieldId is missing or empty');
    throw new Error('Pass rate field ID is required');
  }
  
  try {
    new URL(config.testrailSite);
  } catch {
    throw new Error('Invalid TestRail site URL');
  }
  
  await storage.set('testrailConfig', config);
  console.log('Configuration saved successfully');
  return { success: true };
});

export const handler = res.getDefinitions();
