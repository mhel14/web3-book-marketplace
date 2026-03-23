import { useEffect, useState } from 'react';

import BookCard from '../components/BookCard';
import BookCardSkeleton from '../components/ui/BookCardSkeleton';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import StatusBanner from '../components/ui/StatusBanner';
import { useWallet } from '../context/WalletContext';
import { fetchBooksByOwner, type IBook } from '../services/bookService';

export default function MyLibrary() {
  const { selectedAccount } = useWallet();
  const [books, setBooks] = useState<IBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedAccount) {
      setBooks([]);
      setError('');
      return;
    }

    const loadBooks = async () => {
      setIsLoading(true);
      setError('');

      try {
        const ownedBooks = await fetchBooksByOwner(selectedAccount);
        setBooks(ownedBooks);
      } catch (err) {
        console.error(
          'MyLibrary load failed:',
          err instanceof Error ? err.message : 'Unknown library error',
        );
        setError(err instanceof Error ? err.message : 'Unable to load your library.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBooks();
  }, [selectedAccount]);

  return (
    <div className='space-y-6'>
      <PageHeader
        eyebrow="Book's Collection"
        title='My Library'
        description=''
        aside={
          <div className='rounded-full  px-4 py-2 text-lg text-zinc-300'>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </div>
        }
      />

      {!selectedAccount ? (
        <EmptyState
          title='Connect a wallet to view your shelf'
          description='Your owned books will appear here once a wallet is connected.'
        />
      ) : null}

      {selectedAccount && error ? (
        <StatusBanner tone='error' title='Library unavailable' message={error} />
      ) : null}

      {selectedAccount && isLoading ? (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <BookCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {selectedAccount && !isLoading && !error && books.length === 0 ? (
        <EmptyState
          title='Your library is empty'
          description='Mint a new book or buy one from the marketplace to start building a Web3 reading collection.'
        />
      ) : null}

      {selectedAccount && !isLoading && !error && books.length > 0 ? (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
          {books.map((book) => (
            <BookCard
              key={book.tokenId}
              book={book}
              meta={[
                { label: 'Genre', value: book.genre },
                { label: 'ISBN', value: book.isbn },
                { label: 'Price', value: `${book.price} ETH` },
              ]}
              footer={
                <div className='flex gap-3'>
                  {book.bookUrl ? (
                    <a
                      href={book.bookUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex flex-1 items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/12 px-4 py-2.5 text-sm font-medium text-white transition hover:border-violet-300/30 hover:bg-violet-400/18'
                    >
                      Read Book
                    </a>
                  ) : null}
                  <a
                    href={book.metadataUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='tooltip inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:text-white'
                    data-tooltip='Open the IPFS metadata payload for this NFT.'
                  >
                    Metadata
                  </a>
                </div>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
