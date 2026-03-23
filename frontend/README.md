# Web3 Book Marketplace Frontend

This frontend is a React + TypeScript + Vite app for the Web3 Book Marketplace project.

It lets users:
- connect a wallet
- upload a book cover and PDF to IPFS
- mint book NFTs
- list books for sale
- browse and buy listed books
- manage their library and marketplace listings

## Tech Stack

- React
- TypeScript
- Vite
- Ethers
- Tailwind CSS

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

## Build

Create a production build:

```bash
npm run build
```

## Deployment

The frontend is configured for deployment to GitHub Pages using GitHub Actions.
Set these repository-level GitHub Actions values before deploying:

- `vars.VITE_NFT_CONTRACT_ADDRESS`
- `vars.VITE_MARKETPLACE_CONTRACT_ADDRESS`
- `vars.VITE_PINATA_GATEWAY_DOMAIN`
- `secrets.VITE_PINATA_JWT`
