import FeaturePage from './FeaturePage';

const images = [
  {
    light: require('~/assets/onboarding/favorites.webp'),
    dark: require('~/assets/onboarding/favorites-dark.webp'),
  },
  {
    light: require('~/assets/onboarding/meal-plan.webp'),
    dark: require('~/assets/onboarding/meal-plan-dark.webp'),
  },
];

const FavoritesFeatureScreen = ({ width }: { width: number }) => (
  <FeaturePage
    width={width}
    images={images}
    title="Favorites & Meal Planning"
    subtitle="Press and hold any food to save it or add it to today's plan."
  />
);

export default FavoritesFeatureScreen;
