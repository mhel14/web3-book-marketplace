function requireEnv(name: 'VITE_NFT_CONTRACT_ADDRESS' | 'VITE_MARKETPLACE_CONTRACT_ADDRESS') {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in frontend/.env for local development and in GitHub Actions variables for production builds.`,
    );
  }

  return value;
}

export const NFT_CONTRACT_ADDRESS = requireEnv('VITE_NFT_CONTRACT_ADDRESS');
export const MARKETPLACE_CONTRACT_ADDRESS = requireEnv('VITE_MARKETPLACE_CONTRACT_ADDRESS');
