import { useEffect, useState } from 'react';
import { EventLog, ethers } from 'ethers';

import BookCard from '../components/BookCard';
import BookCardSkeleton from '../components/ui/BookCardSkeleton';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import StatusBanner from '../components/ui/StatusBanner';
import { useToast } from '../components/ui/ToastProvider';
import { useWallet } from '../context/WalletContext';
import { MARKETPLACE_CONTRACT_ADDRESS, NFT_CONTRACT_ADDRESS } from '../utils/env';
import { resolveIPFSUrl, shortAddress } from '../utils/utils';
import { getReadContract, getWriteContract } from '../utils/web3';
const NFT_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
];
const MARKETPLACE_ABI = [
  'function listings(address, uint256) view returns (uint256 price, address seller)',
  'function buyBook(address _nftContract, uint256 _tokenId) payable',
  'function cancelListing(address _nftContract, uint256 _tokenId)',
  'event BookListed(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 price)',
];

interface Listing {
  tokenId: string;
  seller: string;
  price: string;
  priceWei: bigint;
  title: string;
  author: string;
  coverUrl: string;
}

export default function Marketplace() {
  const { selectedAccount } = useWallet();
  const { pushToast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    tone: 'error' | 'loading' | 'success';
    title: string;
    message: string;
  } | null>(null);

  const fetchListings = async () => {
    if (!window.ethereum) {
      setStatus({
        tone: 'error',
        title: 'Wallet provider unavailable',
        message: 'MetaMask needs to be available to resolve marketplace listings.',
      });
      setListings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setStatus({
      tone: 'loading',
      title: 'Refreshing marketplace',
      message: 'Resolving active listings and reading metadata from IPFS.',
    });

    try {
      const marketContract = getReadContract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI);
      const nftContract = getReadContract(NFT_CONTRACT_ADDRESS, NFT_ABI);

      // Fetch all events
      const filter = marketContract.filters.BookListed(NFT_CONTRACT_ADDRESS);
      const events = await marketContract.queryFilter(filter);
      const parsedEvents = events.filter((event): event is EventLog => 'args' in event);

      // This prevents duplicates if a book was listed, unlisted, and listed again.
      const uniqueTokenIds = new Set<string>();
      parsedEvents.forEach((event) => {
        uniqueTokenIds.add(event.args.tokenId.toString());
      });

      // Check status for each unique ID
      const activeListings = await Promise.all(
        Array.from(uniqueTokenIds).map(async (tokenId) => {
          // Check the actual listing state on the contract
          const listingData = await marketContract.listings(NFT_CONTRACT_ADDRESS, tokenId);
          const priceWei = listingData.price as bigint;

          // If price is 0, it is not listed (sold or cancelled)
          if (priceWei <= 0n) {
            return null;
          }

          const owner = await nftContract.ownerOf(tokenId);
          const { seller } = listingData;
          // handle edge case where book with outdated seller appears.
          if (owner.toLowerCase() !== seller.toLowerCase()) return null;

          // Fetch Metadata
          try {
            const uri = await nftContract.tokenURI(tokenId);
            const response = await fetch(resolveIPFSUrl(uri));

            if (!response.ok) throw new Error('Failed to fetch metadata');

            const metadata = await response.json();

            return {
              tokenId,
              seller,
              price: ethers.formatEther(priceWei),
              priceWei,
              title: metadata.title || `Book #${tokenId}`,
              author: metadata.author || 'Unknown author',
              coverUrl: resolveIPFSUrl(metadata.documents?.cover?.url || ''),
            } satisfies Listing;
          } catch (error) {
            console.error(`Error fetching metadata for token ${tokenId}`, error);
            return null;
          }
        }),
      );

      // Filter out nulls (sold/cancelled items or failed metadata fetches)
      setListings(activeListings.filter((listing): listing is Listing => Boolean(listing)));
      setStatus(null);
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      setStatus({
        tone: 'error',
        title: 'Marketplace unavailable',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to resolve marketplace listings right now.',
      });
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchListings();
  }, [selectedAccount]);

  const handleBuy = async (tokenId: string, priceWei: bigint) => {
    if (!window.ethereum) {
      setStatus({
        tone: 'error',
        title: 'Wallet unavailable',
        message: 'MetaMask needs to be available before purchasing a listed book.',
      });
      return;
    }

    if (!selectedAccount) {
      setStatus({
        tone: 'error',
        title: 'Wallet required',
        message: 'Connect a wallet before attempting to purchase a listed book.',
      });
      return;
    }

    setBuyingId(tokenId);
    setStatus({
      tone: 'loading',
      title: 'Purchase in progress',
      message: 'Confirm the purchase transaction in MetaMask to continue.',
    });

    try {
      const { contract: marketContract } = await getWriteContract(
        MARKETPLACE_CONTRACT_ADDRESS,
        MARKETPLACE_ABI,
      );
      const tx = await marketContract.buyBook(NFT_CONTRACT_ADDRESS, tokenId, { value: priceWei });
      await tx.wait();

      setListings((current) => current.filter((listing) => listing.tokenId !== tokenId));
      setStatus({
        tone: 'success',
        title: 'Purchase complete',
        message: 'The book was purchased successfully and should now appear in your library.',
      });
      pushToast({
        title: 'Purchase complete',
        message: 'The listing was purchased successfully.',
        tone: 'success',
      });
    } catch (error: any) {
      console.error(error);
      const message =
        error.code === 'ACTION_REJECTED'
          ? 'User denied transaction signature.'
          : error instanceof Error
            ? error.message
            : 'Transaction failed.';
      setStatus({
        tone: 'error',
        title: 'Purchase failed',
        message,
      });
      pushToast({
        title: 'Purchase failed',
        message,
        tone: 'error',
      });
    } finally {
      setBuyingId(null);
    }
  };

  const handleRemoveListing = async (tokenId: string) => {
    if (!window.ethereum) {
      setStatus({
        tone: 'error',
        title: 'Wallet unavailable',
        message: 'MetaMask needs to be available before removing your listing.',
      });
      return;
    }

    if (!selectedAccount) {
      setStatus({
        tone: 'error',
        title: 'Wallet required',
        message: 'Connect the seller wallet before removing a listed book.',
      });
      return;
    }

    setRemovingId(tokenId);
    setStatus({
      tone: 'loading',
      title: 'Removing listing',
      message: 'Confirm the cancellation transaction in MetaMask to delist your book.',
    });

    try {
      const { contract: marketContract } = await getWriteContract(
        MARKETPLACE_CONTRACT_ADDRESS,
        MARKETPLACE_ABI,
      );
      const tx = await marketContract.cancelListing(NFT_CONTRACT_ADDRESS, tokenId);
      await tx.wait();

      setListings((current) => current.filter((listing) => listing.tokenId !== tokenId));
      setStatus({
        tone: 'success',
        title: 'Listing removed',
        message: 'Your book was removed from the marketplace successfully.',
      });
      pushToast({
        title: 'Listing removed',
        message: 'The book is no longer available for purchase.',
        tone: 'success',
      });
    } catch (error: any) {
      console.error(error);
      const message =
        error.code === 'ACTION_REJECTED'
          ? 'User denied transaction signature.'
          : error instanceof Error
            ? error.message
            : 'Unable to remove this listing.';
      setStatus({
        tone: 'error',
        title: 'Removal failed',
        message,
      });
      pushToast({
        title: 'Removal failed',
        message,
        tone: 'error',
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className='space-y-6'>
      <PageHeader
        eyebrow='Open Market'
        title='Marketplace'
        description='Browse active listings, refresh marketplace state, and purchase books.'
        aside={
          <button
            type='button'
            onClick={fetchListings}
            className='tooltip rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:text-white'
            data-tooltip='Reload active marketplace listings from the contract and IPFS metadata.'
          >
            Refresh Listings
          </button>
        }
      />

      {status ? (
        <StatusBanner tone={status.tone} title={status.title} message={status.message} />
      ) : null}

      {isLoading ? (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <BookCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {!isLoading && listings.length === 0 ? (
        <EmptyState
          title='No live listings right now'
          description='When books are listed for sale, they will appear here with seller information and purchase actions.'
        />
      ) : null}

      {!isLoading && listings.length > 0 ? (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
          {listings.map((book) => {
            const isOwnListing = Boolean(
              selectedAccount && book.seller.toLowerCase() === selectedAccount.toLowerCase(),
            );

            return (
              <BookCard
                key={book.tokenId}
                book={{
                  tokenId: book.tokenId,
                  title: book.title,
                  author: book.author,
                  coverUrl: book.coverUrl,
                }}
                meta={[
                  { label: 'Seller', value: shortAddress(book.seller) },
                  { label: 'Listing price', value: `${book.price} ETH` },
                ]}
                footer={
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between text-sm text-zinc-400'>
                      <span>Seller</span>
                      <span className='font-mono text-zinc-200'>{shortAddress(book.seller)}</span>
                    </div>
                    <button
                      type='button'
                      onClick={() =>
                        isOwnListing
                          ? handleRemoveListing(book.tokenId)
                          : handleBuy(book.tokenId, book.priceWei)
                      }
                      disabled={buyingId === book.tokenId || removingId === book.tokenId}
                      className={`inline-flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                        isOwnListing
                          ? 'border-amber-300/20 bg-amber-500/12 text-white hover:border-amber-300/30 hover:bg-amber-500/18'
                          : 'border-emerald-300/20 bg-emerald-500/12 text-white hover:border-emerald-300/30 hover:bg-emerald-500/18'
                      } disabled:opacity-60`}
                    >
                      {removingId === book.tokenId
                        ? 'Removing...'
                        : buyingId === book.tokenId
                          ? 'Purchasing...'
                          : isOwnListing
                            ? 'Remove Listing'
                            : 'Buy Now'}
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
