import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Save, Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    darkMode: false,
    aiConfidenceThreshold: 0.7,
    responseStyleDefault: 'formal',
    aiAutoSuggest: true,
    defaultWelcomeMessage: 'Cảm ơn bạn đã liên hệ với chúng tôi, chúng tôi sẽ trò chuyện với bạn trong thời gian nhanh nhất'
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [tempWelcomeMessage, setTempWelcomeMessage] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('admin_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('admin_settings', JSON.stringify(settings));
    
    // TODO: Save to backend API
    console.log('Saving settings:', settings);
    
    // Show success message
    alert('Settings saved successfully!');
  };

  const handleWelcomeMessageEdit = () => {
    setTempWelcomeMessage(settings.defaultWelcomeMessage);
    setShowWelcomeModal(true);
  };

  const handleWelcomeMessageSave = () => {
    setSettings(prev => ({
      ...prev,
      defaultWelcomeMessage: tempWelcomeMessage
    }));
    setShowWelcomeModal(false);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !settings.darkMode;
    setSettings(prev => ({ ...prev, darkMode: newDarkMode }));
    localStorage.setItem('admin_settings', JSON.stringify({ ...settings, darkMode: newDarkMode }));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header with Back button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow transition-all duration-200 hover:shadow-md"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">System Settings</h1>
            </div>
            <div className="flex items-center space-x-2">
              <SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-400 transition-colors duration-300" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg transition-all duration-300">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-6 transition-colors duration-300">
                AI Configuration
              </h3>
              
              <div className="space-y-6">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {settings.darkMode ? (
                        <Moon className="w-6 h-6 text-yellow-500 transition-all duration-300 transform rotate-12" />
                      ) : (
                        <Sun className="w-6 h-6 text-orange-500 transition-all duration-300 transform rotate-12" />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                        Dark Mode
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
                        {settings.darkMode ? 'Dark theme is active' : 'Light theme is active'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={toggleDarkMode}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        settings.darkMode ? 'bg-blue-600 shadow-lg' : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                      aria-label={`Switch to ${settings.darkMode ? 'light' : 'dark'} mode`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                          settings.darkMode ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* AI Confidence Threshold */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-300">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    AI Confidence Threshold
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 transition-colors duration-300">
                    Minimum confidence level for AI to provide suggestions
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.aiConfidenceThreshold}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      aiConfidenceThreshold: parseFloat(e.target.value)
                    }))}
                    className="mt-1 block w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200"
                  />
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
                    Current: <span className="font-medium text-blue-600 dark:text-blue-400">{settings.aiConfidenceThreshold}</span>
                  </div>
                </div>

                {/* Default Welcome Message */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-300">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    Default Welcome Message
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 transition-colors duration-300">
                    Message sent automatically when a new customer starts a chat
                  </p>
                  <div className="mt-1 p-3 bg-white dark:bg-gray-600 rounded-md border border-gray-200 dark:border-gray-500 transition-all duration-300">
                    <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-300">
                      {settings.defaultWelcomeMessage}
                    </p>
                  </div>
                  <button
                    onClick={handleWelcomeMessageEdit}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300"
                  >
                    Edit Message
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg transition-all duration-300">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-6 transition-colors duration-300">
                System Information
              </h3>
              
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-300">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors duration-300">Version</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white transition-colors duration-300">1.0.0</dd>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-300">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors duration-300">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white transition-colors duration-300">2024-01-01</dd>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-300">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors duration-300">Database Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white transition-colors duration-300">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 transition-all duration-300">
                      Connected
                    </span>
                  </dd>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-300">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors duration-300">AI Models</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white transition-colors duration-300">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 transition-all duration-300">
                      Active
                    </span>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message Edit Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl transition-all duration-300">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              Edit Welcome Message
            </h3>
            <textarea
              value={tempWelcomeMessage}
              onChange={(e) => setTempWelcomeMessage(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
              placeholder="Enter your welcome message..."
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleWelcomeMessageSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings; 