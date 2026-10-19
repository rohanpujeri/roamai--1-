export function cleanHandle(u: string): string {
  return (u || '').replace(/^@+/, '').trim().toLowerCase();
}

export function isFakeMockUser(_username?: string | null): boolean {
  return false;
}

export function isFakeBio(bio?: string | null): boolean {
  if (!bio) return true;
  const b = bio.trim().toLowerCase();
  if (!b) return true;
  return (
    b.includes('exploring new places') ||
    b.includes('passionate explorer') ||
    b.includes('sharing journey trails') ||
    b.includes('one trip at a time') ||
    b === 'traveler' ||
    b === 'travel explorer'
  );
}

export function cleanBio(bio?: string | null): string {
  if (!bio || isFakeBio(bio)) return '';
  return bio.trim();
}
