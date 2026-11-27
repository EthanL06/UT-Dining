import { usePreventZoomTransitionDismissal } from 'expo-router';

const LEFT_EDGE_ONLY = { unstable_dismissalBoundsRect: { maxX: 24 } };

export const EdgeSwipeDismissal = () => {
  usePreventZoomTransitionDismissal(LEFT_EDGE_ONLY);
  return null;
};
