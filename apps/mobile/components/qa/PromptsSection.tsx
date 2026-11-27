import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import {
  Download,
  History,
  RefreshCcw,
  Rocket,
  Sparkles,
  Star,
  TriangleAlert,
} from 'lucide-react-native';

import { GroupedSection } from '~/components/ui/Grouped';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import {
  refreshChangelog,
  useChangelogPromptStore,
  useChangelogStore,
} from '~/store/useChangelogStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { ActionRow, COLORS, latestVersion, useActionStatus } from './shared';

export const PromptsSection = () => {
  const showPrompt = useChangelogPromptStore((state) => state.showPrompt);
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);
  const resetChangelog = useChangelogStore((state) => state.resetChangelog);
  const resetRatingPrompt = useAppLaunchStore((state) => state.resetRatingPrompt);
  const { run, detail } = useActionStatus();

  const showWhatsNew = async () => {
    await refreshChangelog();
    showPrompt({ kind: 'whats-new', version: latestVersion(), preview: true });
  };

  const showUpdate = async (required: boolean) => {
    await refreshChangelog();
    showPrompt({
      kind: 'update',
      version: latestVersion(),
      required,
      releaseNotes: null,
      preview: true,
    });
  };

  return (
    <GroupedSection
      header="Prompts"
      footer="Required update is dismissible only in this dev build. The App Store build keeps it blocking."
    >
      <ActionRow
        isFirst
        testID="qa-replay-onboarding"
        title="Replay Onboarding"
        Icon={Rocket}
        color={COLORS.orange}
        onPress={() => {
          resetOnboarding();
          router.navigate('/');
        }}
      />
      <ActionRow
        testID="qa-show-whats-new"
        title="Show What's New"
        Icon={Sparkles}
        color={COLORS.purple}
        onPress={showWhatsNew}
      />
      <ActionRow
        testID="qa-show-update-available"
        title="Show Update Available"
        Icon={Download}
        color={COLORS.blue}
        onPress={() => showUpdate(false)}
      />
      <ActionRow
        testID="qa-show-update-required"
        title="Show Update Required"
        Icon={TriangleAlert}
        color={COLORS.red}
        onPress={() => showUpdate(true)}
      />
      <ActionRow
        testID="qa-reset-changelog"
        title="Reset Changelog State"
        subtitle="What's New and updates show again"
        Icon={History}
        color={COLORS.gray}
        detail={detail('changelog')}
        onPress={() => run('changelog', resetChangelog)}
      />
      <ActionRow
        testID="qa-show-rating"
        title="Show Rating Prompt"
        subtitle="iOS may skip it if shown recently"
        Icon={Star}
        color={COLORS.yellow}
        detail={detail('rating')}
        onPress={() => run('rating', () => StoreReview.requestReview())}
      />
      <ActionRow
        testID="qa-reset-rating"
        title="Reset Rating Prompt"
        subtitle="Shows again on the second launch"
        Icon={RefreshCcw}
        color={COLORS.gray}
        detail={detail('resetRating')}
        onPress={() => run('resetRating', resetRatingPrompt)}
      />
    </GroupedSection>
  );
};
