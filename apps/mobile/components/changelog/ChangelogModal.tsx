import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useChangelogPromptStore, useChangelogStore } from '~/store/useChangelogStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';
import { cn } from '~/utils/utils';
import { ChangelogChangeRow, VersionBadge } from './ChangelogEntryView';

const PREVIEW_COUNT = 3;

interface ChangelogModalProps {
  onUpdate: (version: string) => void;
  onIgnore: (version: string) => void;
  onDismissWhatsNew: (version: string) => void;
}

export const ChangelogModal = ({ onUpdate, onIgnore, onDismissWhatsNew }: ChangelogModalProps) => {
  const prompt = useChangelogPromptStore((state) => state.prompt);
  const entry = useChangelogStore((state) =>
    state.entries.find((item) => item.version === prompt?.version),
  );
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  if (!prompt) return null;

  const isUpdate = prompt.kind === 'update';
  const canDismiss = !(isUpdate && prompt.required);
  const changes = entry?.changes ?? [];
  const previewChanges = changes.slice(0, PREVIEW_COUNT);
  const hiddenCount = changes.length - previewChanges.length;

  const titleClass = cn(
    'font-extrabold text-2xl tracking-[-0.3px]',
    isDarkMode ? 'text-white' : 'text-[#111111]',
  );
  const bodyClass = cn(
    'text-[15px] leading-[22px]',
    isDarkMode ? 'text-gray-300' : 'text-[#3A3F48]',
  );

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
          {entry.summary && <Text className={cn('mt-1.5', bodyClass)}>{entry.summary}</Text>}
          <View className="mt-4 gap-y-3">
            {previewChanges.map((change) => (
              <ChangelogChangeRow key={change.title} change={change} compact />
            ))}
          </View>
        </>
      );
    }
    return (
      <Text className={cn('mt-1.5', bodyClass)}>
        {prompt.kind === 'update' && prompt.releaseNotes
          ? prompt.releaseNotes
          : 'Bug fixes and improvements.'}
      </Text>
    );
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/40 p-2">
        <Pressable
          className="absolute inset-0"
          accessibilityLabel="Close"
          disabled={!canDismiss}
          onPress={handleClose}
        />
        <View
          testID="changelog-modal"
          className={cn(
            'rounded-[32px] px-[22px] pt-2.5 pb-5',
            isDarkMode ? 'border border-neutral-700 bg-neutral-800' : 'bg-white',
          )}
          style={{ maxHeight: '88%' }}
        >
          <View
            className={cn(
              'h-[5px] w-[38px] self-center rounded-full',
              isDarkMode ? 'bg-neutral-600' : 'bg-[#D6D3CE]',
            )}
          />
          <ScrollView
            className="mt-[18px] flex-grow-0"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {isUpdate ? (
              <>
                <View className="flex-row">
                  <VersionBadge version={prompt.version} isLatest />
                </View>
                <Text className={cn('mt-2.5', titleClass)}>
                  {canDismiss ? 'A new version is ready' : 'Update required'}
                </Text>
                {!canDismiss && (
                  <Text className={cn('mt-1.5', bodyClass)}>
                    This version of UT Dining is no longer supported. Update to keep using the app.
                  </Text>
                )}
                {updateBody()}
              </>
            ) : (
              <>
                <Text className="font-bold text-[13px] text-ut-burnt-orange tracking-[0.5px]">
                  VERSION {prompt.version}
                </Text>
                <Text className={cn('mt-0.5', titleClass)}>What's new</Text>
                <View className="mt-5 gap-y-4">
                  {previewChanges.length > 0 ? (
                    previewChanges.map((change) => (
                      <ChangelogChangeRow key={change.title} change={change} />
                    ))
                  ) : (
                    <Text className={bodyClass}>Bug fixes and improvements.</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>

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
                  <Text
                    className={cn(
                      'font-semibold text-base',
                      isDarkMode ? 'text-gray-200' : 'text-[#3A3F48]',
                    )}
                  >
                    Not now
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="changelog-update-button"
                  activeOpacity={0.8}
                  className="h-[52px] flex-1 items-center justify-center rounded-full bg-ut-burnt-orange"
                  onPress={() => onUpdate(prompt.version)}
                >
                  <Text className="font-bold text-base text-white">Update</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                testID="changelog-update-button"
                activeOpacity={0.8}
                className="mt-[22px] h-[52px] items-center justify-center rounded-full bg-ut-burnt-orange"
                onPress={() => onUpdate(prompt.version)}
              >
                <Text className="font-bold text-base text-white">Update</Text>
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
                <Text className="font-semibold text-[15px] text-ut-burnt-orange">
                  {hiddenCount > 0 ? `Show all ${changes.length} changes` : 'See full changelog'}
                </Text>
                <ChevronRight size={16} color={COLORS['ut-burnt-orange']} strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity
                testID="changelog-continue-button"
                activeOpacity={0.8}
                className="mt-2 h-[54px] items-center justify-center rounded-full bg-ut-burnt-orange"
                onPress={() => onDismissWhatsNew(prompt.version)}
              >
                <Text className="font-bold text-[17px] text-white">Continue</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
