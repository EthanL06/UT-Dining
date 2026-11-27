import { execSync } from 'node:child_process';

const VARIANT = process.env.APP_VARIANT ?? 'production';
const IS_DEV = VARIANT !== 'production';
const STAGING_CHANNEL = 'staging';
const DEV_UPDATES_ENABLED = process.env.DEV_UPDATES === '1';

const updatesConfig = () => {
  const url = 'https://u.expo.dev/005ee5ea-5ec3-4d96-af00-5d6203694b74';
  if (!IS_DEV) return { url };
  return {
    url,
    enabled: DEV_UPDATES_ENABLED,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    requestHeaders: { 'expo-channel-name': STAGING_CHANNEL },
  };
};

const readGitCommit = () => {
  if (process.env.EAS_BUILD_GIT_COMMIT_HASH) {
    return process.env.EAS_BUILD_GIT_COMMIT_HASH.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
};

export default {
  expo: {
    name: IS_DEV ? 'UT Dining (Dev)' : 'UT Dining',
    slug: 'ut-dining',
    version: '1.2.4',
    scheme: IS_DEV ? ['ut-dining', 'ut-dining-dev'] : 'ut-dining',
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/icons/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#F2F2F7',
          dark: {
            image: './assets/icons/splash-icon.png',
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-sqlite',
        {
          enableFTS: true,
          android: {
            enableFTS: false,
          },
          ios: {
            customBuildFlags: ['-DSQLITE_ENABLE_DBSTAT_VTAB=1 -DSQLITE_ENABLE_SNAPSHOT=1'],
          },
        },
      ],
      'expo-font',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'UT Dining needs your location to show your location on the map.',
          locationAlwaysAndWhenInUsePermission:
            'UT Dining needs your location to show your location on the map.',
        },
      ],
      'expo-notifications',
      'expo-localization',
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
    orientation: 'portrait',
    icon: './assets/icons/ios-light.png',
    userInterfaceStyle: 'automatic',

    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      icon: {
        dark: './assets/icons/ios-dark.png',
        light: './assets/icons/ios-light.png',
        tinted: './assets/icons/ios-tinted.png',
      },
      bundleIdentifier: IS_DEV ? 'com.ethanl06.ut-dining.dev' : 'com.ethanl06.ut-dining',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'UT Dining needs your location to show your location on the map.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'UT Dining needs your location to show your location on the map.',
        NSLocationUsageDescription:
          'UT Dining needs your location to show your location on the map.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/icons/adaptive-icon.png',
        backgroundColor: '#BF5700',
      },
      bundleIdentifier: IS_DEV ? 'com.ethanl06.ut-dining.dev' : 'com.ethanl06.ut-dining',
      package: 'com.ethanl06.utdining',
    },
    newArchEnabled: true,
    extra: {
      gitCommit: readGitCommit(),
      router: {
        origin: false,
      },
      eas: {
        projectId: '005ee5ea-5ec3-4d96-af00-5d6203694b74',
      },
    },
    owner: 'ethanl06',
    runtimeVersion: {
      policy: IS_DEV ? 'fingerprint' : 'appVersion',
    },
    updates: updatesConfig(),
  },
};
