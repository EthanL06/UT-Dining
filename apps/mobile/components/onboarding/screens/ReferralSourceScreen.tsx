import {
  Book,
  Calendar,
  Eye,
  HelpCircle,
  Mail,
  Megaphone,
  Search,
  Users,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '~/utils/theme';
import ChoiceList, { type Choice } from './ChoiceList';
import OnboardingHeader from './OnboardingHeader';

type Props = {
  width: number;
  onSelectionChange: (hasSelection: boolean) => void;
  onSelectionUpdate: (selectedTag: string | null) => void;
};

const REFERRAL_SOURCES: Choice[] = [
  { id: 'friend-family', label: 'Friend or family', icon: Users },
  { id: 'social-media', label: 'Social media (TikTok, LinkedIn, etc.)', icon: Megaphone },
  { id: 'advertisement', label: 'Advertisement (online or in-person)', icon: Mail },
  { id: 'on-campus', label: 'Seen being used on campus', icon: Eye },
  { id: 'search-engine', label: 'Search engine (Google, Bing, etc.)', icon: Search },
  { id: 'class-professor', label: 'Professor or class', icon: Book },
  { id: 'event-fair', label: 'At an event or fair', icon: Calendar },
  { id: 'other', label: 'Other', icon: HelpCircle },
];

const ReferralSourceScreen = ({ width, onSelectionChange, onSelectionUpdate }: Props) => {
  const theme = useTheme();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const toggleTag = (tagId: string) => {
    const newSelection = selectedTag === tagId ? null : tagId;
    setSelectedTag(newSelection);
    onSelectionChange(newSelection !== null);
    onSelectionUpdate(newSelection);
  };

  return (
    <View style={{ width, backgroundColor: theme.background }} className="flex-1 pt-6">
      <OnboardingHeader
        title="How'd you hear about us?"
        subtitle="Pick the option that fits best."
      />
      <ChoiceList
        choices={REFERRAL_SOURCES}
        isSelected={(id) => selectedTag === id}
        onToggle={toggleTag}
      />
    </View>
  );
};

export default ReferralSourceScreen;
