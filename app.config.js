module.exports = ({ config }) => {
  const androidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const iosApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY;
  // El pipeline de release fija la versión (semantic-release) y un versionCode
  // creciente; en local quedan los de app.json.
  const appVersion = process.env.APP_VERSION;
  const versionCode = Number.parseInt(
    process.env.ANDROID_VERSION_CODE ?? '',
    10,
  );

  return {
    ...config,
    ...(appVersion ? { version: appVersion } : {}),
    android: {
      ...config.android,
      ...(Number.isInteger(versionCode) ? { versionCode } : {}),
      ...(androidApiKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: { apiKey: androidApiKey },
            },
          }
        : {}),
    },
    ios: {
      ...config.ios,
      ...(iosApiKey
        ? {
            config: {
              ...config.ios?.config,
              googleMapsApiKey: iosApiKey,
            },
          }
        : {}),
    },
  };
};
