import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  aside?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, aside }: PageHeaderProps) {
  return (
    <div className='flex flex-col gap-4 rounded-[1.75rem]  pt-2 md:flex-row md:items-start md:justify-between'>
      <div className='max-w-2xl space-y-3 text-left'>
        {eyebrow ? (
          <p className='text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/75'>
            {eyebrow}
          </p>
        ) : null}
        <div className='space-y-2'>
          <h1 className='text-3xl font-semibold tracking-tight text-white md:text-4xl'>{title}</h1>
          <p className='max-w-xl text-sm leading-6 text-zinc-400 md:text-base'>{description}</p>
        </div>
      </div>
      {aside ? <div className='text-left md:text-right'>{aside}</div> : null}
    </div>
  );
}
