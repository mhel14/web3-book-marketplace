import { NavLink } from 'react-router-dom';

const links = [
  { to: '/my-library', label: 'My Library' },
  { to: '/upload', label: 'Upload' },
  { to: '/sell', label: 'Sell' },
  { to: '/purchase', label: 'Marketplace' },
];

export default function NavBar() {
  return (
    <header className=' px-5 py-4 md:px-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <NavLink to='/' className='flex items-center gap-3 self-start'>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-lg'>
            <span aria-hidden='true'>📚</span>
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500'>
              Dev mhel {'</>'}
            </p>
            <h2 className='text-lg font-semibold tracking-tight text-white md:text-xl'>
              Web3 Bookstore
            </h2>
          </div>
        </NavLink>

        <nav aria-label='Primary navigation'>
          <ul className='flex flex-wrap items-center gap-2'>
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'border-violet-300/25 bg-violet-400/12 text-white'
                        : 'border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/16 hover:bg-white/[0.05] hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
