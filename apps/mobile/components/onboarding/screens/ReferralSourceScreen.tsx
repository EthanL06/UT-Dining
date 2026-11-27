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
import { View } from 'react-native';

import { useTheme } from '~/utils/theme';
import ChoiceList, { type Choice } from './ChoiceList';
import OnboardingHeader from './OnboardingHeader';

type Props = {
  width: number;
  selected: string | null;
  onChange: (selected: string | null) => void;
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

const ReferralSourceScreen = ({ width, selected, onChange }: Props) => {
  const theme = useTheme();

  const toggleTag = (tagId: string) => {
    onChange(selected === tagId ? null : tagId);
  };

  return (
    <View style={{ width, backgroundColor: theme.background }} className="flex-1 pt-6">
      <OnboardingHeader
        title="How'd you hear about us?"
        subtitle="Pick the option that fits best."
      />
      <ChoiceList
        choices={REFERRAL_SOURCES}
        isSelected={(id) => selected === id}
        onToggle={toggleTag}
      />
    </View>
  );
};

export default ReferralSourceScreen;
