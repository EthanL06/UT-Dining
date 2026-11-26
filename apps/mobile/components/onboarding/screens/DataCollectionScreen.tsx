import { Book, Calendar, Clock, Heart, Leaf, MapPin, Timer, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '~/utils/theme';
import ChoiceList, { type Choice } from './ChoiceList';
import OnboardingHeader from './OnboardingHeader';

type Props = {
  width: number;
  onSelectionChange: (hasSelection: boolean) => void;
  onSelectionUpdate: (selectedTags: string[]) => void;
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

const DataCollectionScreen = ({ width, onSelectionChange, onSelectionUpdate }: Props) => {
  const theme = useTheme();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tagId: string) => {
    const newSelection = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newSelection);
    onSelectionChange(newSelection.length > 0);
    onSelectionUpdate(newSelection);
  };

  return (
    <View style={{ width, backgroundColor: theme.background }} className="flex-1 pt-6">
      <OnboardingHeader
        title="Before we get started"
        subtitle="What do you want from UT Dining? Pick all that apply."
      />
      <ChoiceList
        choices={MOTIVATION_TAGS}
        isSelected={(id) => selectedTags.includes(id)}
        onToggle={toggleTag}
      />
    </View>
  );
};

export default DataCollectionScreen;
