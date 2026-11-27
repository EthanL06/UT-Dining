import FeaturePage from './FeaturePage';

const images = [
  {
    light: require('~/assets/onboarding/map.webp'),
    dark: require('~/assets/onboarding/map-dark.webp'),
  },
];

const MapFeatureScreen = ({ width }: { width: number }) => (
  <FeaturePage
    width={width}
    images={images}
    title="Find Food Near You"
    subtitle="Every dining hall, food truck and coffee shop on one map, with hours and walking times."
  />
);

export default MapFeatureScreen;
