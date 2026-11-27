import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';

export const LAYER_FADE_OUT_MS = 100;
export const LAYER_FADE_IN_MS = 220;

const ENTERING = FadeIn.duration(LAYER_FADE_IN_MS).delay(LAYER_FADE_OUT_MS + 20);
const EXITING = FadeOut.duration(LAYER_FADE_OUT_MS);

export const SheetLayer = ({ layerKey, children }: { layerKey: string; children: ReactNode }) => (
  <View style={{ flex: 1 }}>
    <LayoutAnimationConfig skipEntering>
      <Reanimated.View
        key={layerKey}
        entering={ENTERING}
        exiting={EXITING}
        style={StyleSheet.absoluteFill}
      >
        {children}
      </Reanimated.View>
    </LayoutAnimationConfig>
  </View>
);
