export default function BookCardSkeleton() {
  return (
    <div className='overflow-hidden rounded-[1.4rem] border border-white/8 bg-zinc-950/75 animate-pulse'>
      <div className='aspect-[3/4] bg-white/[0.06]' />
      <div className='space-y-3 p-5'>
        <div className='h-5 w-2/3 rounded-full bg-white/[0.08]' />
        <div className='h-4 w-1/2 rounded-full bg-white/[0.06]' />
        <div className='h-4 w-full rounded-full bg-white/[0.05]' />
        <div className='h-4 w-5/6 rounded-full bg-white/[0.05]' />
      </div>
    </div>
  );
}
