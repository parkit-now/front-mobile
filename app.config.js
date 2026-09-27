module.exports = ({ config }) => {
  const androidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const iosApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY;

  return {
    ...config,
    android: {
      ...config.android,
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
