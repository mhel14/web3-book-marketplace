interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className='rounded-[1.6rem] border border-dashed border-white/12 bg-white/[0.025] px-6 py-14 text-center'>
      <div className='mx-auto max-w-md space-y-2'>
        <h2 className='text-2xl font-semibold text-white'>{title}</h2>
        <p className='leading-5 text-zinc-400'>{description}</p>
      </div>
    </div>
  );
}
