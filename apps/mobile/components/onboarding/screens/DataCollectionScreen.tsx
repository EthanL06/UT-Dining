import { Book, Calendar, Clock, Heart, Leaf, MapPin, Timer, Utensils } from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '~/utils/theme';
import ChoiceList, { type Choice } from './ChoiceList';
import OnboardingHeader from './OnboardingHeader';

type Props = {
  width: number;
  selected: string[];
  onChange: (selected: string[]) => void;
};

const MOTIVATION_TAGS: Choice[] = [
  { id: 'view-menus', label: 'View Menus', icon: Book },
  { id: 'see-nearby', label: "See What's Near Me", icon: MapPin },
  { id: 'check-hours', label: 'Check Hours & Status', icon: Clock },
  { id: 'save-time', label: 'Save Time', icon: Timer },
  { id: 'try-new-places', label: 'Try New Places', icon: Utensils },
  { id: 'track-favorites', label: 'Keep Track of Favorites', icon: Heart },
  { id: 'plan-meals', label: 'Plan My Meals', icon: Calendar },
  { id: 'filter-by-diet', label: 'Filter by Diet', icon: Leaf },
];

const DataCollectionScreen = ({ width, selected, onChange }: Props) => {
  const theme = useTheme();

  const toggleTag = (tagId: string) => {
    onChange(
      selected.includes(tagId) ? selected.filter((id) => id !== tagId) : [...selected, tagId],
    );
  };

  return (
    <View style={{ width, backgroundColor: theme.background }} className="flex-1 pt-6">
      <OnboardingHeader
        title="Before we get started"
        subtitle="What do you want from UT Dining? Pick all that apply."
      />
      <ChoiceList
        choices={MOTIVATION_TAGS}
        isSelected={(id) => selected.includes(id)}
        onToggle={toggleTag}
      />
    </View>
  );
};

export default DataCollectionScreen;
