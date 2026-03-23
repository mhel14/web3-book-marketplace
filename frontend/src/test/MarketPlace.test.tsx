import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pushToast: vi.fn(),
  getReadContract: vi.fn(),
  getWriteContract: vi.fn(),
  walletState: {
    selectedAccount: '0xseller000000000000000000000000000000000001',
  },
}));

vi.mock('../context/WalletContext', () => ({
  useWallet: () => ({
    selectedAccount: mocks.walletState.selectedAccount,
  }),
}));

vi.mock('../components/ui/ToastProvider', () => ({
  useToast: () => ({ pushToast: mocks.pushToast }),
}));

vi.mock('../utils/web3', () => ({
  getReadContract: mocks.getReadContract,
  getWriteContract: mocks.getWriteContract,
}));

import Marketplace from '../pages/MarketPlace';

describe('Marketplace page', () => {
  beforeEach(() => {
    mocks.pushToast.mockReset();
    mocks.getReadContract.mockReset();
    mocks.getWriteContract.mockReset();
    mocks.walletState.selectedAccount = '0xseller000000000000000000000000000000000001';
    window.ethereum = { request: vi.fn(), on: vi.fn(), removeListener: vi.fn() };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Test Listing',
        author: 'Alice',
        documents: { cover: { url: 'ipfs://cover' } },
      }),
    }) as typeof fetch;
  });

  function mockListingContracts(seller: string) {
    const marketContract = {
      filters: { BookListed: vi.fn(() => 'filter') },
      queryFilter: vi.fn().mockResolvedValue([{ args: { tokenId: 1n } }]),
      listings: vi.fn().mockResolvedValue({
        price: 1000000000000000000n,
        seller,
      }),
    };
    const nftContract = {
      ownerOf: vi.fn().mockResolvedValue(seller),
      tokenURI: vi.fn().mockResolvedValue('ipfs://metadata'),
    };

    let call = 0;
    mocks.getReadContract.mockImplementation(() => {
      call += 1;
      return call === 1 ? marketContract : nftContract;
    });

    return { marketContract };
  }

  it('renders remove action for owned listings', async () => {
    mockListingContracts(mocks.walletState.selectedAccount);
    mocks.getWriteContract.mockResolvedValue({
      contract: {
        cancelListing: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(undefined) }),
      },
    });

    render(<Marketplace />);

    expect(await screen.findByText('Test Listing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Listing' })).toBeInTheDocument();
  });

  it('renders buy action for listings owned by someone else', async () => {
    mockListingContracts('0xbuyer000000000000000000000000000000000002');
    mocks.getWriteContract.mockResolvedValue({
      contract: { buyBook: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(undefined) }) },
    });

    render(<Marketplace />);

    expect(await screen.findByText('Test Listing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy Now' })).toBeInTheDocument();
  });

  it('removes an owned listing when the seller confirms cancellation', async () => {
    const { marketContract } = mockListingContracts(mocks.walletState.selectedAccount);
    const cancelListing = vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue(undefined) });
    mocks.getWriteContract.mockResolvedValue({ contract: { cancelListing } });

    render(<Marketplace />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Remove Listing' }));

    await waitFor(() => {
      expect(cancelListing).toHaveBeenCalledTimes(1);
      expect(mocks.pushToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Listing removed', tone: 'success' }),
      );
    });

    expect(marketContract.queryFilter).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Test Listing')).not.toBeInTheDocument();
  });
});
