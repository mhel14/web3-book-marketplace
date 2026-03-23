import type { ReactNode } from 'react';

import type { IBook } from '../services/bookService';

interface BookCardProps {
  book: Pick<IBook, 'tokenId' | 'title' | 'author' | 'coverUrl'>;
  meta?: Array<{ label: string; value?: string }>;
  footer?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export default function BookCard({
  book,
  meta = [],
  footer,
  selected = false,
  onClick,
}: BookCardProps) {
  const interactive = Boolean(onClick);

  return (
    <article
      className={`group overflow-hidden rounded-[1.4rem] border bg-zinc-950/80 shadow-xl transition duration-300 ${
        selected
          ? 'border-violet-300/40 shadow-violet-950/40'
          : 'border-white/10 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl'
      } ${interactive ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className='relative aspect-[3/4] overflow-hidden bg-zinc-900'>
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]'
          />
        ) : (
          <div className='flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.15),transparent_55%)] px-6 text-center text-sm text-zinc-500'>
            Cover preview unavailable
          </div>
        )}
        <div className='absolute right-3 top-3 rounded-full border border-white/10 bg-black/65 px-3 py-1 text-xs font-medium text-zinc-100'>
          #{book.tokenId}
        </div>
      </div>

      <div className='space-y-4 p-5 text-left'>
        <div className='space-y-1.5'>
          <h3 className='line-clamp-1 text-lg font-semibold text-white'>{book.title}</h3>
          <p className='line-clamp-1 text-sm text-zinc-400'>by {book.author || 'Unknown author'}</p>
        </div>

        {meta.length > 0 ? (
          <dl className='grid gap-2 text-sm text-zinc-400'>
            {meta.map((item) => (
              <div key={item.label} className='flex items-start justify-between gap-3'>
                <dt className='text-zinc-500'>{item.label}</dt>
                <dd className='max-w-[60%] truncate text-right text-zinc-200'>{item.value || 'N/A'}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {footer ? <div className='border-t border-white/6 pt-4'>{footer}</div> : null}
      </div>
    </article>
  );
}
