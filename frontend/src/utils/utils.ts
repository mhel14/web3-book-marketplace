export const PINATA_GATEWAY_DOMAIN =
  import.meta.env.VITE_PINATA_GATEWAY_DOMAIN || 'gateway.pinata.cloud';

export const shortAddress = (addr: string) =>
  addr && addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

export const resolveIPFSUrl = (uri: string): string => {
  if (!uri) return '';

  // Case A: Already an HTTP URL
  if (uri.startsWith('http')) return uri;

  // Case B: Standard IPFS URI (ipfs://...)
  if (uri.startsWith('ipfs://')) {
    // Replace with multiple gateway options for robustness
    return uri.replace('ipfs://', `https://${PINATA_GATEWAY_DOMAIN}/ipfs/`);
  }

  // Case C: Just a raw CID (fallback)
  return `https://${PINATA_GATEWAY_DOMAIN}/ipfs/${uri}`;
};
