import { usePreventZoomTransitionDismissal } from 'expo-router';
import { useEffect, useState } from 'react';

const LEFT_EDGE_ONLY = { unstable_dismissalBoundsRect: { maxX: 24 } };

const EdgeSwipeDismissalBounds = () => {
  usePreventZoomTransitionDismissal(LEFT_EDGE_ONLY);
  return null;
};

export const EdgeSwipeDismissal = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <EdgeSwipeDismissalBounds /> : null;
};
