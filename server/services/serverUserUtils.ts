export function cleanHandle(u: string): string {
  return (u || '').replace(/^@+/, '').trim().toLowerCase();
}

export function isFakeMockUser(_username?: string | null): boolean {
  return false;
}
