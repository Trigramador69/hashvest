/**
 * Maps a wallet to its organization member record so the UI can show a display
 * name and presentation role label beside an address. Presentation only: it
 * grants nothing. Protocol roles come from `@/lib/protocol/roles`.
 */
export function findMemberByWallet<T extends { walletAddress: string }>(
  members: readonly T[] | undefined,
  walletAddress: string,
) {
  return members?.find(
    (member) =>
      member.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
  );
}
