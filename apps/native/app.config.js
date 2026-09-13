const app = require("./app.json");

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

module.exports = {
  expo: {
    ...app.expo,
    ios: {
      ...app.expo.ios,
      config: {
        ...(app.expo.ios.config ?? {}),
        googleMapsApiKey,
      },
      infoPlist: {
        ...app.expo.ios.infoPlist,
        NSLocationWhenInUseUsageDescription:
          "MediConnect uses your location to find nearby enrolled clinics.",
      },
    },
    android: {
      ...app.expo.android,
      config: {
        ...(app.expo.android.config ?? {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    plugins: [
      ...app.expo.plugins,
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "MediConnect uses your location to find nearby enrolled clinics.",
        },
      ],
    ],
  },
};
