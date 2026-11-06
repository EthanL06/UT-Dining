import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { getChangelogEntry } from '~/data/Changelog';
import { useChangelogPromptStore } from '~/store/useChangelogStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';
import { cn } from '~/utils/utils';
import { ChangelogChanges } from './ChangelogEntryView';

interface ChangelogModalProps {
  onUpdate: (version: string) => void;
  onIgnore: (version: string) => void;
  onDismissWhatsNew: (version: string) => void;
}

export const ChangelogModal = ({ onUpdate, onIgnore, onDismissWhatsNew }: ChangelogModalProps) => {
  const prompt = useChangelogPromptStore((state) => state.prompt);
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [isAtEnd, setIsAtEnd] = useState(false);

  if (!prompt) return null;

  const canScroll = contentHeight > listHeight + 1;

  const entry = getChangelogEntry(prompt.version);
  const isUpdate = prompt.kind === 'update';
  const canDismiss = !(isUpdate && prompt.required);

  const title = isUpdate ? 'Update available' : "What's new";
  const subtitle = isUpdate
    ? `Version ${prompt.version} is on the App Store.`
    : `You're now on version ${prompt.version}.`;

  const handleClose = () => {
    if (!canDismiss) return;
    if (isUpdate) onIgnore(prompt.version);
    else onDismissWhatsNew(prompt.version);
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View
          testID="changelog-modal"
          className={cn(
            'w-full max-w-md overflow-hidden rounded-3xl',
            isDarkMode ? 'border border-neutral-700 bg-neutral-800' : 'bg-white',
          )}
          style={{ maxHeight: '80%' }}
        >
          <View className="items-center gap-y-2 px-6 pt-6">
            <View
              className={cn(
                'h-12 w-12 items-center justify-center rounded-full',
                isDarkMode ? 'bg-neutral-700' : 'bg-orange-100',
              )}
            >
              <Sparkles size={22} color={COLORS['ut-burnt-orange']} />
            </View>
            <Text
              className={cn(
                'text-center font-extrabold text-2xl',
                isDarkMode ? 'text-white' : 'text-black',
              )}
            >
              {title}
            </Text>
            <Text
              className={cn('text-center text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500')}
            >
              {subtitle}
            </Text>
          </View>

          <ScrollView
            className="mt-4"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
            persistentScrollbar
            onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
            onContentSizeChange={(_, height) => setContentHeight(height)}
            onScroll={(event) => {
              const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
              setIsAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 8);
            }}
            scrollEventThrottle={32}
          >
            {entry ? (
              <ChangelogChanges entry={entry} />
            ) : isUpdate && prompt.releaseNotes ? (
              <Text className={cn('text-base', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
                {prompt.releaseNotes}
              </Text>
            ) : (
              <Text className={cn('text-base', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
                Bug fixes and improvements.
              </Text>
            )}
          </ScrollView>

          <View
            className={cn(
              'gap-y-2 p-6',
              canScroll && !isAtEnd && 'border-t',
              isDarkMode ? 'border-neutral-700' : 'border-gray-200',
            )}
          >
            {canScroll && !isAtEnd && (
              <Text
                className={cn(
                  '-mt-3 mb-1 text-center text-xs',
                  isDarkMode ? 'text-gray-400' : 'text-gray-500',
                )}
              >
                Scroll for more
              </Text>
            )}
            {isUpdate ? (
              <>
                <TouchableOpacity
                  testID="changelog-update-button"
                  activeOpacity={0.8}
                  className="items-center rounded-xl bg-ut-burnt-orange py-3.5"
                  onPress={() => onUpdate(prompt.version)}
                >
                  <Text className="font-bold text-base text-white">Update</Text>
                </TouchableOpacity>
                {canDismiss && (
                  <TouchableOpacity
                    testID="changelog-ignore-button"
                    activeOpacity={0.7}
                    className="items-center py-2"
                    onPress={() => onIgnore(prompt.version)}
                  >
                    <Text
                      className={cn(
                        'font-semibold text-base',
                        isDarkMode ? 'text-gray-400' : 'text-gray-500',
                      )}
                    >
                      Ignore
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  testID="changelog-continue-button"
                  activeOpacity={0.8}
                  className="items-center rounded-xl bg-ut-burnt-orange py-3.5"
                  onPress={() => onDismissWhatsNew(prompt.version)}
                >
                  <Text className="font-bold text-base text-white">Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="changelog-see-all-button"
                  activeOpacity={0.7}
                  className="items-center py-2"
                  onPress={() => {
                    onDismissWhatsNew(prompt.version);
                    router.push('/changelog');
                  }}
                >
                  <Text className="font-semibold text-base text-ut-burnt-orange">
                    See full changelog
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
