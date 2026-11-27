import { File, Paths } from 'expo-file-system';
import { useEffect } from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';
import { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { miscStorage } from '~/store/misc-storage';
import type { FrameBatch } from '~/utils/frameStats';
import { log } from '~/utils/log';

export const FRAME_MONITOR_KEY = 'frameMonitor';
export const FRAME_LOG_NAME = 'frame-log.jsonl';

const FLUSH_MS = 500;

const append = (batch: FrameBatch) => {
  new File(Paths.document, FRAME_LOG_NAME)
    .write(`${JSON.stringify(batch)}\n`, { append: true })
    .catch((error: unknown) => log.warn('frame log write failed', { error: String(error) }));
};

const round = (value: number) => {
  'worklet';
  return Math.round(value * 100) / 100;
};

const Recorder = () => {
  const uiFrames = useSharedValue<number[]>([]);

  useFrameCallback((frame) => {
    'worklet';
    const frames = uiFrames.value;
    frames.push(round(frame.timestamp));
    if (frames.length > 1 && frame.timestamp - frames[0] >= FLUSH_MS) {
      runOnJS(append)({ thread: 'ui', epoch: Date.now(), clock: frame.timestamp, frames });
      uiFrames.value = [];
    }
  });

  useEffect(() => {
    const file = new File(Paths.document, FRAME_LOG_NAME);
    if (!file.exists) file.create();
    let frames: number[] = [];
    let handle = 0;
    const tick = (time: number) => {
      frames.push(round(time));
      if (time - frames[0] >= FLUSH_MS) {
        append({ thread: 'js', epoch: Date.now(), clock: performance.now(), frames });
        frames = [];
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, []);

  return null;
};

export const FrameMonitor = () => {
  const [enabled] = useMMKVBoolean(FRAME_MONITOR_KEY, miscStorage);
  return enabled ? <Recorder /> : null;
};
