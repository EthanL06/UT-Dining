export const isNewerVersion = (currentVersion: string, candidateVersion: string): boolean => {
  const current = currentVersion.split('.').map(Number);
  const candidate = candidateVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(current.length, candidate.length); i++) {
    const currentPart = current[i] || 0;
    const candidatePart = candidate[i] || 0;

    if (candidatePart > currentPart) return true;
    if (candidatePart < currentPart) return false;
  }

  return false;
};
