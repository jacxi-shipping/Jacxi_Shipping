const appJson = require('./app.json');

const appEnv = process.env.EXPO_PUBLIC_APP_ENV || process.env.APP_ENV || 'development';
const defaultApiUrl = ['production', 'staging'].includes(appEnv)
  ? 'https://www.jacxishipping.com'
  : 'http://localhost:3000';
const apiUrl = process.env.EXPO_PUBLIC_API_URL || defaultApiUrl;

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiUrl,
      appEnv,
    },
  },
};