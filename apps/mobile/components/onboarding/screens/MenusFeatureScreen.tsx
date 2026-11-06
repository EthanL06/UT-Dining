import FeaturePage from './FeaturePage';

const images = [
  {
    light: require('~/assets/onboarding/menu.webp'),
    dark: require('~/assets/onboarding/menu-dark.webp'),
  },
];

const MenusFeatureScreen = ({ width }: { width: number }) => (
  <FeaturePage
    width={width}
    images={images}
    title="Browse Menus with Ease"
    subtitle="No more guessing. Know what's on the menu before you go."
  />
);

export default MenusFeatureScreen;
