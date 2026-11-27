import * as Application from 'expo-application';

export const DEV_BUNDLE_ID = 'com.ethanl06.ut-dining.dev';

export const isDevVariant = Application.applicationId === DEV_BUNDLE_ID;

export const showQaTools = isDevVariant || __DEV__;
