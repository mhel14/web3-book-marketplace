import { shortAddress } from '../utils/utils';
import { useWallet } from '../context/WalletContext';
import StatusBanner from './ui/StatusBanner';

export default function WalletInfo() {
  const {
    connectWallet,
    selectedAccount,
    balance,
    isConnecting,
    accounts,
    updateAccount,
    error,
    clearError,
  } = useWallet();

  return (
    <section className='page-card-strong relative overflow-hidden p-5 md:p-6'>
      <div className='absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_70%)]' />
      <div className='relative space-y-5'>
        <div className='flex flex-col gap-3 text-left md:flex-row md:items-end md:justify-between'>
          <div className='space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500'>
              Wallet Status
            </p>
            <h3 className='text-2xl font-semibold tracking-tight text-white'>
              {selectedAccount ? 'Connected Wallet' : 'Connect to unlock features'}
            </h3>
          </div>
          {!selectedAccount ? (
            <button
              type='button'
              onClick={connectWallet}
              disabled={isConnecting}
              className='inline-flex items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/12 px-5 py-3 text-sm font-semibold text-white transition hover:border-violet-300/30 hover:bg-violet-400/16 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isConnecting ? 'Connecting wallet...' : 'Connect Wallet'}
            </button>
          ) : null}
        </div>

        {selectedAccount && (
          <div className='grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)]'>
            <div className='rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4 text-left'>
              <label
                htmlFor='wallet-account'
                className='mb-2 block text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500'
              >
                Active Account
              </label>

              {accounts.length > 1 ? (
                <select
                  id='wallet-account'
                  value={selectedAccount}
                  onChange={async (event) => await updateAccount(event.target.value)}
                  className='input-shell font-mono text-sm'
                >
                  {accounts.map((account) => (
                    <option key={account} value={account}>
                      {shortAddress(account)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className='rounded-2xl border border-white/8 bg-zinc-950/70 px-4 py-3 font-mono text-sm text-zinc-200'>
                  {selectedAccount}
                </div>
              )}
            </div>

            <div className='rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4 text-left'>
              <p className='text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500'>
                Available Balance
              </p>
              <div className='mt-4 flex items-end gap-2'>
                <span className='text-3xl font-semibold tracking-tight text-white'>
                  {balance || '0.0000'}
                </span>
                <span className='pb-1 text-sm font-medium uppercase tracking-[0.2em] text-violet-200/75'>
                  ETH
                </span>
              </div>
              <p className='mt-3 text-sm text-zinc-400'>
                Keep enough ETH available to cover transactions fees.
              </p>
            </div>
          </div>
        )}

        {error ? (
          <div className='space-y-3'>
            <StatusBanner tone='error' title='Wallet issue' message={error} />
            <button
              type='button'
              onClick={clearError}
              className='text-sm text-zinc-400 transition hover:text-white'
            >
              Dismiss wallet message
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
