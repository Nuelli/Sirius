import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { invoke } from '@forge/bridge';
import 'tailwindcss/tailwind.css';

const App = () => {
  const [config, setConfig] = useState({
    testrailUser: '',
    testrailToken: '',
    testrailSite: '',
    coverageFieldId: '',
    passRateFieldId: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing configuration
  useEffect(() => {
    invoke('getConfig').then(data => {
      if (data) {
        setConfig(data);
      }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!config.testrailUser || !config.testrailToken || !config.testrailSite || !config.coverageFieldId || !config.passRateFieldId) {
      setError('All fields are required');
      return;
    }

    // Basic URL validation
    try {
      new URL(config.testrailSite);
    } catch {
      setError('Invalid TestRail site URL');
      return;
    }

    try {
      await invoke('saveConfig', config);
      setSuccess('Configuration saved successfully');
    } catch (err) {
      setError('Failed to save configuration');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">TestRail Configuration</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">TestRail Username</label>
          <input
            type="text"
            name="testrailUser"
            value={config.testrailUser}
            onChange={handleChange}
            placeholder="Enter your TestRail username (e.g., user@example.com)"
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">TestRail API Token</label>
          <input
            type="text"
            name="testrailToken"
            value={config.testrailToken}
            onChange={handleChange}
            placeholder="Enter your TestRail API token"
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">TestRail Site URL</label>
          <input
            type="text"
            name="testrailSite"
            value={config.testrailSite}
            onChange={handleChange}
            placeholder="Enter your TestRail site URL (e.g., [invalid url, do not cite])"
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Coverage Field ID</label>
          <input
            type="text"
            name="coverageFieldId"
            value={config.coverageFieldId}
            onChange={handleChange}
            placeholder="e.g., customfield_11969"
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Pass Rate Field ID</label>
          <input
            type="text"
            name="passRateFieldId"
            value={config.passRateFieldId}
            onChange={handleChange}
            placeholder="e.g., customfield_11999"
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));