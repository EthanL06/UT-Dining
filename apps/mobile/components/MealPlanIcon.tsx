import { ChefHat } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const HAT_TOP =
  'M18 15.4v-.75c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041v.751Z';
const HAT_BRIM = 'M6 18.6h12V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1Z';

type MealPlanIconProps = {
  size?: number;
  color: string;
  filled?: boolean;
};

export const MealPlanIcon = ({ size = 24, color, filled = false }: MealPlanIconProps) => {
  if (!filled) return <ChefHat size={size} color={color} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {[HAT_TOP, HAT_BRIM].map((d) => (
        <Path
          key={d}
          d={d}
          fill={color}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
};
