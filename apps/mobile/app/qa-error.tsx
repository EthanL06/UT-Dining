import { Redirect, useLocalSearchParams } from 'expo-router';
import { AppErrorScreen, MIGRATION_ERROR_COPY } from '~/components/AppErrorScreen';
import { showQaTools } from '~/utils/appVariant';

const Crash = (): null => {
  throw new Error('QA preview of the error screen');
};

export default function QAErrorPreview() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();

  if (!showQaTools) return <Redirect href="/" />;
  if (kind === 'migration') {
    return (
      <AppErrorScreen
        {...MIGRATION_ERROR_COPY}
        error={new Error('QA preview of the migration error')}
        source="qa-preview"
      />
    );
  }
  return <Crash />;
}
