type BannerTone = 'info' | 'loading' | 'success' | 'error' | 'warning';

const toneClasses: Record<BannerTone, string> = {
  info: 'border-white/12 bg-white/5 text-zinc-200',
  loading: 'border-violet-400/20 bg-violet-500/8 text-violet-100',
  success: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  error: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
  warning: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
};

interface StatusBannerProps {
  tone?: BannerTone;
  title?: string;
  message: string;
  compact?: boolean;
}

export default function StatusBanner({
  tone = 'info',
  title,
  message,
  compact = false,
}: StatusBannerProps) {
  return (
    <div
      className={`rounded-2xl border px-4 ${compact ? 'py-3 text-sm' : 'py-4'} ${toneClasses[tone]}`}
      role='status'
      aria-live='polite'
    >
      {title ? <p className='mb-1 font-semibold text-white'>{title}</p> : null}
      <p className='leading-relaxed'>{message}</p>
    </div>
  );
}
