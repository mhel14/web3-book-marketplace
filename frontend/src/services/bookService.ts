import { resolveIPFSUrl } from '../utils/utils';
import { NFT_CONTRACT_ADDRESS } from '../utils/env';
import { getReadContract } from '../utils/web3';

const CONTRACT_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
];

interface TransferEventLike {
  args: {
    tokenId: bigint;
  };
}

export interface IBook {
  tokenId: string;
  title: string;
  author: string;
  genre: string;
  price: string;
  isbn: string;
  coverUrl: string;
  bookUrl: string;
  metadataUrl: string;
}

export async function fetchBooksByOwner(ownerAddress: string): Promise<IBook[]> {
  if (!ownerAddress || !window.ethereum) {
    return [];
  }

  try {
    const contract = getReadContract(NFT_CONTRACT_ADDRESS, CONTRACT_ABI);
    const filter = contract.filters.Transfer(null, ownerAddress);
    const events = await contract.queryFilter(filter);

    const tokenIds = new Set<string>();
    events.forEach((event) => {
      const typedEvent = event as unknown as TransferEventLike;

      tokenIds.add(typedEvent.args.tokenId.toString());
    });

    const books = await Promise.all(
      [...tokenIds].map(async (tokenId) => {
        const currentOwner = await contract.ownerOf(tokenId);
        if (currentOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
          return null;
        }

        const uri = await contract.tokenURI(tokenId);
        const httpUrl = resolveIPFSUrl(uri);
        const response = await fetch(httpUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch metadata for token #${tokenId}.`);
        }

        const metadata = await response.json();

        return {
          title: metadata.title || `Book #${tokenId}`,
          author: metadata.author || 'Unknown author',
          genre: metadata.genre || 'Uncategorized',
          price: metadata.price || '0',
          isbn: metadata.isbn || 'N/A',
          tokenId,
          coverUrl: resolveIPFSUrl(metadata.documents?.cover?.url || ''),
          bookUrl: resolveIPFSUrl(metadata.documents?.book?.url || ''),
          metadataUrl: httpUrl,
        } satisfies IBook;
      }),
    );

    return books.filter((book): book is IBook => Boolean(book));
  } catch (error) {
    console.error('Error in fetchBooksByOwner:', error);
    throw new Error('Unable to load books for the connected wallet.');
  }
}
