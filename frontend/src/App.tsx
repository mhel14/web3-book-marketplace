import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import NavBar from './components/NavBar';
import WalletInfo from './components/WalletInfo';

const Marketplace = lazy(() => import('./pages/MarketPlace'));
const MyLibrary = lazy(() => import('./pages/MyLibrary'));
const Sell = lazy(() => import('./pages/Sell'));
const Upload = lazy(() => import('./pages/Upload'));

export default function App() {
  return (
    <div className='app-frame'>
      <div className='app-shell'>
        <NavBar />
        <main className='page-shell'>
          <WalletInfo />
          <section className='page-card p-5 md:p-6 lib-section'>
            <Suspense
              fallback={
                <div className='rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-6 py-16 text-center text-zinc-400'>
                  Loading page...
                </div>
              }
            >
              <Routes>
                <Route path='/' element={<MyLibrary />} />
                <Route path='/upload' element={<Upload />} />
                <Route path='/sell' element={<Sell />} />
                <Route path='/purchase' element={<Marketplace />} />
                <Route path='/my-library' element={<MyLibrary />} />
              </Routes>
            </Suspense>
          </section>
        </main>
      </div>
    </div>
  );
}
