import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SheetScrollView } from '~/components/map/SheetScrollView';
import { Text } from '~/components/ui/Text';
import { useChangelogPromptStore, useChangelogStore } from '~/store/useChangelogStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { isDevVariant } from '~/utils/appVariant';
import { COLORS } from '~/utils/colors';
import { cn } from '~/utils/utils';
import { ChangelogChangeRow, VersionBadge } from './ChangelogEntryView';
import { PromptSheet } from './PromptSheet';

const PREVIEW_COUNT = 3;

interface ChangelogModalProps {
  onUpdate: (version: string) => void;
  onIgnore: (version: string) => void;
  onDismissWhatsNew: (version: string) => void;
}

export const ChangelogModal = ({ onUpdate, onIgnore, onDismissWhatsNew }: ChangelogModalProps) => {
  const activePrompt = useChangelogPromptStore((state) => state.prompt);
  const [prompt, setPrompt] = useState(activePrompt);
  if (activePrompt && activePrompt !== prompt) setPrompt(activePrompt);
  const entry = useChangelogStore((state) =>
    state.entries.find((item) => item.version === prompt?.version),
  );
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  if (!prompt) return null;

  const isUpdate = prompt.kind === 'update';
  const isRequired = isUpdate && prompt.required;
  const canDismiss = !isRequired || isDevVariant;
  const changes = entry?.changes ?? [];
  const previewChanges = changes.slice(0, PREVIEW_COUNT);
  const hiddenCount = changes.length - previewChanges.length;

  const titleColor = isDarkMode ? '#FFFFFF' : '#111111';
  const bodyColor = isDarkMode ? '#D1D5DB' : '#3A3F48';

  const handleClose = () => {
    if (!canDismiss) return;
    if (isUpdate) onIgnore(prompt.version);
    else onDismissWhatsNew(prompt.version);
  };

  const openChangelog = () => {
    onDismissWhatsNew(prompt.version);
    router.push('/changelog');
  };

  const updateBody = () => {
    if (entry) {
      return (
        <>
          {entry.summary && (
            <Text variant="subheadline" paragraph color={bodyColor} className="mt-1.5">
              {entry.summary}
            </Text>
          )}
          <View className="mt-4 gap-y-3">
            {previewChanges.map((change) => (
              <ChangelogChangeRow key={change.title} change={change} compact />
            ))}
          </View>
        </>
      );
    }
    return (
      <Text variant="subheadline" paragraph color={bodyColor} className="mt-1.5">
        {prompt.kind === 'update' && prompt.releaseNotes
          ? prompt.releaseNotes
          : 'Bug fixes and improvements.'}
      </Text>
    );
  };

  return (
    <PromptSheet
      visible={activePrompt !== null}
      dismissible={canDismiss}
      onDismiss={handleClose}
      onClosed={() => setPrompt(null)}
    >
      <View
        testID="changelog-modal"
        className={cn(
          'rounded-[32px] px-[22px] pt-2.5 pb-5',
          isDarkMode ? 'border border-neutral-700 bg-neutral-800' : 'bg-white',
        )}
        style={{ flexShrink: 1 }}
      >
        <View
          className={cn(
            'h-[5px] w-[38px] self-center rounded-full',
            isDarkMode ? 'bg-neutral-600' : 'bg-[#D6D3CE]',
          )}
        />
        <SheetScrollView containerClassName="mt-[18px]" showsVerticalScrollIndicator={false}>
          {isUpdate ? (
            <>
              <View className="flex-row">
                <VersionBadge version={prompt.version} isLatest />
              </View>
              <Text variant="title2" color={titleColor} className="mt-2.5">
                {isRequired ? 'Update required' : 'A new version is ready'}
              </Text>
              {isRequired && (
                <Text variant="subheadline" paragraph color={bodyColor} className="mt-1.5">
                  This version of UT Dining is no longer supported. Update to keep using the app.
                </Text>
              )}
              {isRequired && isDevVariant && (
                <Text
                  variant="footnote"
                  emphasized
                  testID="changelog-dev-dismiss-note"
                  color={COLORS['ut-burnt-orange']}
                  className="mt-1.5"
                >
                  Dev build: you can dismiss this. The App Store build can't.
                </Text>
              )}
              {updateBody()}
            </>
          ) : (
            <>
              <Text variant="eyebrow" color={COLORS['ut-burnt-orange']}>
                VERSION {prompt.version}
              </Text>
              <Text variant="title2" color={titleColor} className="mt-0.5">
                What's new
              </Text>
              <View className="mt-5 gap-y-4">
                {previewChanges.length > 0 ? (
                  previewChanges.map((change) => (
                    <ChangelogChangeRow key={change.title} change={change} />
                  ))
                ) : (
                  <Text variant="subheadline" paragraph color={bodyColor}>
                    Bug fixes and improvements.
                  </Text>
                )}
              </View>
            </>
          )}
        </SheetScrollView>

        {isUpdate ? (
          canDismiss ? (
            <View className="mt-[22px] flex-row gap-x-2.5">
              <TouchableOpacity
                testID="changelog-ignore-button"
                activeOpacity={0.7}
                className={cn(
                  'h-[52px] flex-1 items-center justify-center rounded-full',
                  isDarkMode ? 'bg-neutral-700' : 'bg-[#F1EFEC]',
                )}
                onPress={() => onIgnore(prompt.version)}
              >
                <Text variant="headline" color={isDarkMode ? '#E5E7EB' : '#3A3F48'}>
                  Not now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="changelog-update-button"
                activeOpacity={0.8}
                className="bg-ut-burnt-orange h-[52px] flex-1 items-center justify-center rounded-full"
                onPress={() => onUpdate(prompt.version)}
              >
                <Text variant="headline" tone="onTint">
                  Update
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              testID="changelog-update-button"
              activeOpacity={0.8}
              className="bg-ut-burnt-orange mt-[22px] h-[52px] items-center justify-center rounded-full"
              onPress={() => onUpdate(prompt.version)}
            >
              <Text variant="headline" tone="onTint">
                Update
              </Text>
            </TouchableOpacity>
          )
        ) : (
          <>
            <TouchableOpacity
              testID="changelog-see-all-button"
              activeOpacity={0.7}
              className="mt-2.5 min-h-11 flex-row items-center gap-x-1"
              onPress={openChangelog}
            >
              <Text variant="subheadline" emphasized color={COLORS['ut-burnt-orange']}>
                {hiddenCount > 0 ? `Show all ${changes.length} changes` : 'See full changelog'}
              </Text>
              <ChevronRight size={16} color={COLORS['ut-burnt-orange']} strokeWidth={2.4} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="changelog-continue-button"
              activeOpacity={0.8}
              className="bg-ut-burnt-orange mt-2 h-[54px] items-center justify-center rounded-full"
              onPress={() => onDismissWhatsNew(prompt.version)}
            >
              <Text variant="headline" tone="onTint">
                Continue
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </PromptSheet>
  );
};
