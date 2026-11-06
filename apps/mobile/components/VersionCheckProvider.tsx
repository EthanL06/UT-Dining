import type React from 'react';

import { ChangelogModal } from '~/components/changelog/ChangelogModal';
import { useVersionCheck } from '~/hooks/useVersionCheck';

interface VersionCheckProviderProps {
  children: React.ReactNode;
}

export const VersionCheckProvider: React.FC<VersionCheckProviderProps> = ({ children }) => {
  const { handleUpdate, handleIgnore, handleDismissWhatsNew } = useVersionCheck();

  return (
    <>
      {children}
      <ChangelogModal
        onUpdate={handleUpdate}
        onIgnore={handleIgnore}
        onDismissWhatsNew={handleDismissWhatsNew}
      />
    </>
  );
};
