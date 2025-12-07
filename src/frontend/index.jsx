import React, { useState, useEffect } from 'react';
import { invoke, showFlag } from '@forge/bridge';
import ForgeReconciler, {
  Box,
  Button,
  Heading,
  Stack,
  Textfield,
  Text,
  Label,
  Inline,
  Spinner,
} from '@forge/react';

const AdminConfigPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState({
    testrailUser: '',
    testrailToken: '',
    testrailSite: '',
    coverageFieldId: '',
    passRateFieldId: '',
  });

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await invoke('getConfig');
        console.log('Loaded config:', data);
        if (data) {
          setConfig(data);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        showFlag({
          id: 'load-error',
          title: 'Error',
          type: 'error',
          description: 'Failed to load configuration',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    console.log('handleSave called with config:', config);
    
    // Validate all fields are present
    if (
      !config.testrailUser ||
      !config.testrailToken ||
      !config.testrailSite ||
      !config.coverageFieldId ||
      !config.passRateFieldId
    ) {
      console.log('Frontend validation failed');
      showFlag({
        id: 'validation-error',
        title: 'Validation Error',
        type: 'error',
        description: 'All fields are required',
      });
      return;
    }

    // Validate URL format
    try {
      new URL(config.testrailSite);
    } catch {
      console.log('URL validation failed');
      showFlag({
        id: 'url-validation-error',
        title: 'Validation Error',
        type: 'error',
        description: 'Invalid TestRail site URL',
      });
      return;
    }

    try {
      console.log('Invoking saveConfig with config:', JSON.stringify(config));
      const result = await invoke('saveConfig', config);
      console.log('Configuration saved successfully, result:', result);
      showFlag({
        id: 'save-success',
        title: 'Success',
        type: 'success',
        description: 'Configuration saved successfully',
      });
    } catch (error) {
      console.error('Failed to save config:', error);
      showFlag({
        id: 'save-error',
        title: 'Error',
        type: 'error',
        description: error.message || 'Failed to save configuration',
      });
    }
  };

  if (isLoading) {
    return (
      <Box padding="space.300">
        <Inline alignInline="center">
          <Spinner size="large" />
        </Inline>
      </Box>
    );
  }

  return (
    <Box padding="space.300">
      <Stack space="space.400">
        <Stack space="space.100">
          <Heading size="xlarge">TestRail Configuration</Heading>
          <Text>Configure your TestRail API credentials and Jira custom field mappings</Text>
        </Stack>

        <Stack space="space.300">
          <Stack space="space.100">
            <Label htmlFor="testrailUser">TestRail Username</Label>
            <Textfield
              id="testrailUser"
              name="testrailUser"
              value={config.testrailUser}
              onChange={handleChange}
              placeholder="user@example.com"
              type="text"
            />
            <Text size="small">Your TestRail account email or username</Text>
          </Stack>

          <Stack space="space.100">
            <Label htmlFor="testrailToken">TestRail API Token</Label>
            <Textfield
              id="testrailToken"
              name="testrailToken"
              value={config.testrailToken}
              onChange={handleChange}
              placeholder="Enter your API token"
              type="password"
            />
            <Text size="small">Generate this from your TestRail account settings</Text>
          </Stack>

          <Stack space="space.100">
            <Label htmlFor="testrailSite">TestRail Site URL</Label>
            <Textfield
              id="testrailSite"
              name="testrailSite"
              value={config.testrailSite}
              onChange={handleChange}
              placeholder="https://yoursite.testrail.io"
              type="url"
            />
            <Text size="small">Your TestRail instance URL (e.g., https://company.testrail.io)</Text>
          </Stack>

          <Stack space="space.100">
            <Label htmlFor="coverageFieldId">Test Coverage Field ID</Label>
            <Textfield
              id="coverageFieldId"
              name="coverageFieldId"
              value={config.coverageFieldId}
              onChange={handleChange}
              placeholder="customfield_10000"
              type="text"
            />
            <Text size="small">Custom field ID for storing test coverage percentage</Text>
          </Stack>

          <Stack space="space.100">
            <Label htmlFor="passRateFieldId">Test Pass Rate Field ID</Label>
            <Textfield
              id="passRateFieldId"
              name="passRateFieldId"
              value={config.passRateFieldId}
              onChange={handleChange}
              placeholder="customfield_10001"
              type="text"
            />
            <Text size="small">Custom field ID for storing test pass rate percentage</Text>
          </Stack>

          <Button
            appearance="primary"
            onClick={handleSave}
          >
            Save Configuration
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <AdminConfigPage />
  </React.StrictMode>
);