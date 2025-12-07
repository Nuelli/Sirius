import React, { useState, useEffect } from 'react';
import { invoke, showFlag } from '@forge/bridge';
import {
  Box,
  Button,
  Heading,
  Stack,
  Textfield,
  Text,
  Label,
} from '@forge/react';

const AdminConfigPage = () => {
  const [config, setConfig] = useState({
    testrailUser: '',
    testrailToken: '',
    testrailSite: '',
    coverageFieldId: '',
    passRateFieldId: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await invoke('getConfig');
        if (data) {
          setConfig(data);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        showFlag({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (
      !config.testrailUser ||
      !config.testrailToken ||
      !config.testrailSite ||
      !config.coverageFieldId ||
      !config.passRateFieldId
    ) {
      showFlag({
        title: 'Validation Error',
        type: 'error',
        description: 'All fields are required',
      });
      setIsSaving(false);
      return;
    }

    // Basic URL validation
    try {
      new URL(config.testrailSite);
    } catch {
      showFlag({
        title: 'Validation Error',
        type: 'error',
        description: 'Invalid TestRail site URL',
      });
      setIsSaving(false);
      return;
    }

    try {
      await invoke('saveConfig', { payload: config });
      showFlag({
        title: 'Success',
        type: 'success',
        description: 'Configuration saved successfully',
      });
    } catch (error) {
      console.error('Failed to save config:', error);
      showFlag({
        title: 'Error',
        type: 'error',
        description: 'Failed to save configuration',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box padding="space.200">
        <Text>Loading configuration...</Text>
      </Box>
    );
  }

  return (
    <Box padding="space.300">
      <Stack space="space.300">
        <div>
          <Heading size="large">TestRail Configuration</Heading>
          <Text>Configure your TestRail credentials and Jira custom field IDs</Text>
        </div>

        <form onSubmit={handleSubmit}>
          <Stack space="space.200">
            {/* TestRail User */}
            <div>
              <Label labelFor="testrailUser">TestRail Username</Label>
              <Textfield
                id="testrailUser"
                name="testrailUser"
                value={config.testrailUser}
                onChange={handleChange}
                placeholder="Enter your TestRail username (e.g., user@example.com)"
                type="text"
              />
            </div>

            {/* TestRail Token */}
            <div>
              <Label labelFor="testrailToken">TestRail API Token</Label>
              <Textfield
                id="testrailToken"
                name="testrailToken"
                value={config.testrailToken}
                onChange={handleChange}
                placeholder="Enter your TestRail API token"
                type="password"
              />
            </div>

            {/* TestRail Site URL */}
            <div>
              <Label labelFor="testrailSite">TestRail Site URL</Label>
              <Textfield
                id="testrailSite"
                name="testrailSite"
                value={config.testrailSite}
                onChange={handleChange}
                placeholder="Enter your TestRail site URL (e.g., https://yoursite.testrail.io)"
                type="url"
              />
            </div>

            {/* Coverage Field ID */}
            <div>
              <Label labelFor="coverageFieldId">Coverage Field ID</Label>
              <Textfield
                id="coverageFieldId"
                name="coverageFieldId"
                value={config.coverageFieldId}
                onChange={handleChange}
                placeholder="e.g., customfield_11969"
                type="text"
              />
            </div>

            {/* Pass Rate Field ID */}
            <div>
              <Label labelFor="passRateFieldId">Pass Rate Field ID</Label>
              <Textfield
                id="passRateFieldId"
                name="passRateFieldId"
                value={config.passRateFieldId}
                onChange={handleChange}
                placeholder="e.g., customfield_11999"
                type="text"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              appearance="primary"
              isDisabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};

export default AdminConfigPage;
