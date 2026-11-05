import { Skeleton, Stack, Title } from '@mantine/core';
import React from 'react';
import {
  AboutSection,
  CreditsSection,
  HelpSupportSection,
} from '@/components/dashboard/configuration';
import type { AppConfig, CreditsConfig, HelpSupportConfig } from '@/types/config';
import { getAppConfig, getCreditsConfig, getHelpSupportConfig } from './action';

function ConfigurationContent() {
  // Fetch all configuration data
  const appConfigPromise = getAppConfig();
  const creditsConfigPromise = getCreditsConfig();
  const helpSupportConfigPromise = getHelpSupportConfig();

  return (
    <React.Suspense
      fallback={
        <Stack gap="xl">
          <Skeleton height={400} />
          <Skeleton height={400} />
          <Skeleton height={400} />
        </Stack>
      }
    >
      <ConfigurationSections
        appConfigPromise={appConfigPromise}
        creditsConfigPromise={creditsConfigPromise}
        helpSupportConfigPromise={helpSupportConfigPromise}
      />
    </React.Suspense>
  );
}

async function ConfigurationSections({
  appConfigPromise,
  creditsConfigPromise,
  helpSupportConfigPromise,
}: {
  appConfigPromise: Promise<AppConfig>;
  creditsConfigPromise: Promise<CreditsConfig>;
  helpSupportConfigPromise: Promise<HelpSupportConfig>;
}) {
  // Wait for all data to load
  const [appConfig, creditsConfig, helpSupportConfig] = await Promise.all([
    appConfigPromise,
    creditsConfigPromise,
    helpSupportConfigPromise,
  ]);

  return (
    <Stack gap="xl">
      <Title order={1}>App Configuration</Title>

      <AboutSection initialConfig={appConfig} />
      <CreditsSection initialConfig={creditsConfig} />
      <HelpSupportSection initialConfig={helpSupportConfig} />
    </Stack>
  );
}

export default function ConfigurationPage() {
  return (
    <Stack component="main" py="md" px="lg">
      <ConfigurationContent />
    </Stack>
  );
}
