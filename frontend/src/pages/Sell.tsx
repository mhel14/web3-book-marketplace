import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import BookCard from '../components/BookCard';
import BookCardSkeleton from '../components/ui/BookCardSkeleton';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import StatusBanner from '../components/ui/StatusBanner';
import { useToast } from '../components/ui/ToastProvider';
import { useWallet } from '../context/WalletContext';
import { fetchBooksByOwner, type IBook } from '../services/bookService';
import marketPlaceContractData from '../utils/BooksMarketplace.json';
import { createContract, getSigner } from '../utils/web3';

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
const MARKETPLACE_CONTRACT_ADDRESS = import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS;
const NFT_ABI = [
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
];
const MARKETPLACE_ABI = marketPlaceContractData.abi;

export default function Sell() {
  const { selectedAccount } = useWallet();
  const { pushToast } = useToast();
  const [myBooks, setMyBooks] = useState<IBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<IBook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    tone: 'loading' | 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!selectedAccount) {
      setMyBooks([]);
      setSelectedBook(null);
      setLoadError('');
      return;
    }

    const loadBooks = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const ownedBooks = await fetchBooksByOwner(selectedAccount);
        setMyBooks(ownedBooks);
      } catch (error) {
        console.error(error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load books for listing.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBooks();
  }, [selectedAccount]);

  const handleListBook = async () => {
    if (!selectedBook || !selectedBook.price) {
      setStatus({
        tone: 'error',
        title: 'Book selection required',
        message: 'Choose a book with a metadata price before sending it to the marketplace.',
      });
      return;
    }

    if (!window.ethereum) {
      setStatus({
        tone: 'error',
        title: 'Wallet unavailable',
        message: 'MetaMask needs to be available before listing a book.',
      });
      return;
    }

    setIsLoading(true);
    setStatus({
      tone: 'loading',
      title: 'Approval step',
      message: 'Checking whether the marketplace already has approval to manage your books.',
    });

    try {
      const { signer } = await getSigner();
      const nftContract = createContract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);
      const marketContract = createContract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, signer);

      const isApproved = await nftContract.isApprovedForAll(
        signer.address,
        MARKETPLACE_CONTRACT_ADDRESS,
      );

      if (!isApproved) {
        const approveTx = await nftContract.setApprovalForAll(MARKETPLACE_CONTRACT_ADDRESS, true);
        await approveTx.wait();
        setStatus({
          tone: 'loading',
          title: 'Listing step',
          message: 'Approval complete. Confirm the listing transaction in your wallet.',
        });
      } else {
        setStatus({
          tone: 'loading',
          title: 'Listing step',
          message: 'Marketplace already approved. Sending the listing transaction now.',
        });
      }

      const priceInWei = ethers.parseEther(selectedBook.price);
      const listTx = await marketContract.listBook(
        NFT_CONTRACT_ADDRESS,
        selectedBook.tokenId,
        priceInWei,
      );
      await listTx.wait();

      setStatus({
        tone: 'success',
        title: 'Listing complete',
        message: `${selectedBook.title} is now listed in the marketplace.`,
      });
      pushToast({
        title: 'Book listed',
        message: `${selectedBook.title} is now available for purchase.`,
        tone: 'success',
      });
      setMyBooks((current) => current.filter((book) => book.tokenId !== selectedBook.tokenId));
      setSelectedBook(null);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Unable to list this book right now.';
      setStatus({
        tone: 'error',
        title: 'Listing failed',
        message,
      });
      pushToast({
        title: 'Listing failed',
        message,
        tone: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <PageHeader eyebrow="Book's Collection" title='Sell Your Book' description='' />

      {!selectedAccount ? (
        <EmptyState
          title='Connect a wallet to create listings'
          description='Your owned books and listing actions appear here once a wallet is connected.'
        />
      ) : null}

      {selectedAccount && loadError ? (
        <StatusBanner tone='error' title='Sell page unavailable' message={loadError} />
      ) : null}
      {selectedAccount && status ? (
        <StatusBanner tone={status.tone} title={status.title} message={status.message} />
      ) : null}

      {selectedAccount && isLoading && myBooks.length === 0 ? (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <BookCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {selectedAccount && !isLoading && !loadError && myBooks.length === 0 ? (
        <EmptyState
          title='No books ready to sell'
          description='Mint or purchase a book first, then come back here to create a marketplace listing.'
        />
      ) : null}

      {selectedAccount && myBooks.length > 0 ? (
        <div className='grid gap-6 xl:grid-cols-[1.35fr_0.65fr]'>
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3'>
            {myBooks.map((book) => (
              <BookCard
                key={book.tokenId}
                book={book}
                selected={selectedBook?.tokenId === book.tokenId}
                onClick={() => setSelectedBook(book)}
                meta={[
                  { label: 'Genre', value: book.genre },
                  { label: 'ISBN', value: book.isbn },
                  { label: 'Metadata price', value: `${book.price} ETH` },
                ]}
                footer={
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-sm text-zinc-400'>
                      {selectedBook?.tokenId === book.tokenId
                        ? 'Selected for listing'
                        : 'Click to select'}
                    </span>
                    <span className='rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-200'>
                      #{book.tokenId}
                    </span>
                  </div>
                }
              />
            ))}
          </div>

          <aside className='page-card-strong h-fit space-y-5 p-6 text-left'>
            <div className='space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500'>
                Selected Listing
              </p>
              <h2 className='text-2xl font-semibold tracking-tight text-white'>
                {selectedBook ? selectedBook.title : 'Choose a title'}
              </h2>
            </div>

            {selectedBook ? (
              <div className='space-y-4'>
                <div className='rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4'>
                  <p className='text-xs uppercase tracking-[0.24em] text-zinc-500'>Listing price</p>
                  <p className='mt-3 text-3xl font-semibold tracking-tight text-white'>
                    {selectedBook.price} ETH
                  </p>
                  <p className='mt-2 text-sm text-zinc-400'>Derived from metadata</p>
                </div>

                <button
                  type='button'
                  onClick={handleListBook}
                  disabled={isLoading}
                  className='inline-flex w-full items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/12 px-5 py-3 text-sm font-semibold text-white transition hover:border-violet-300/30 hover:bg-violet-400/18 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isLoading ? 'Submitting listing...' : 'List for Sale'}
                </button>
              </div>
            ) : (
              <EmptyState
                title='No book selected'
                description='Choose one of your library items and create a listing.'
              />
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
