import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pushToast: vi.fn(),
  fetchBooksByOwner: vi.fn(),
  getSigner: vi.fn(),
  createContract: vi.fn(),
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

vi.mock('../services/bookService', () => ({
  fetchBooksByOwner: mocks.fetchBooksByOwner,
}));

vi.mock('../utils/web3', () => ({
  getSigner: mocks.getSigner,
  createContract: mocks.createContract,
}));

import Sell from '../pages/Sell';

describe('listing flow', () => {
  beforeEach(() => {
    mocks.pushToast.mockReset();
    mocks.fetchBooksByOwner.mockReset();
    mocks.getSigner.mockReset();
    mocks.createContract.mockReset();
    mocks.walletState.selectedAccount = '0xseller000000000000000000000000000000000001';
    window.ethereum = { request: vi.fn(), on: vi.fn(), removeListener: vi.fn() };
  });

  it('lists a selected book after approval and shows success feedback', async () => {
    mocks.fetchBooksByOwner.mockResolvedValue([
      {
        tokenId: '1',
        title: 'My Listed Book',
        author: 'Alice',
        genre: 'Sci-Fi',
        price: '0.05',
        isbn: '123',
        coverUrl: '',
        bookUrl: '',
        metadataUrl: 'https://example.com/meta.json',
      },
    ]);

    const signer = { address: mocks.walletState.selectedAccount };
    const approveWait = vi.fn().mockResolvedValue(undefined);
    const listWait = vi.fn().mockResolvedValue(undefined);
    const nftContract = {
      isApprovedForAll: vi.fn().mockResolvedValue(false),
      setApprovalForAll: vi.fn().mockResolvedValue({ wait: approveWait }),
    };
    const marketContract = {
      listBook: vi.fn().mockResolvedValue({ wait: listWait }),
    };

    mocks.getSigner.mockResolvedValue({ signer });
    mocks.createContract.mockReturnValueOnce(nftContract).mockReturnValueOnce(marketContract);

    render(<Sell />);

    const user = userEvent.setup();
    await user.click(await screen.findByText('My Listed Book'));
    await user.click(screen.getByRole('button', { name: 'List for Sale' }));

    await waitFor(() => {
      expect(nftContract.isApprovedForAll).toHaveBeenCalledWith(
        mocks.walletState.selectedAccount,
        import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS,
      );
      expect(nftContract.setApprovalForAll).toHaveBeenCalledWith(
        import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS,
        true,
      );
      expect(marketContract.listBook).toHaveBeenCalledWith(
        import.meta.env.VITE_NFT_CONTRACT_ADDRESS,
        '1',
        50000000000000000n,
      );
      expect(mocks.pushToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Book listed', tone: 'success' }),
      );
    });

    expect(screen.getByText('Listing complete')).toBeInTheDocument();
    expect(screen.queryByText('My Listed Book')).not.toBeInTheDocument();
  });

  it('shows a friendly error when the selected book is already listed', async () => {
    mocks.fetchBooksByOwner.mockResolvedValue([
      {
        tokenId: '1',
        title: 'My Listed Book',
        author: 'Alice',
        genre: 'Sci-Fi',
        price: '0.05',
        isbn: '123',
        coverUrl: '',
        bookUrl: '',
        metadataUrl: 'https://example.com/meta.json',
      },
    ]);

    const signer = { address: mocks.walletState.selectedAccount };
    const nftContract = {
      isApprovedForAll: vi.fn().mockResolvedValue(true),
      setApprovalForAll: vi.fn(),
    };
    const marketContract = {
      listBook: vi.fn().mockRejectedValue({
        code: 'CALL_EXCEPTION',
        data: '0xa3d582ec',
      }),
    };

    mocks.getSigner.mockResolvedValue({ signer });
    mocks.createContract.mockReturnValueOnce(nftContract).mockReturnValueOnce(marketContract);

    render(<Sell />);

    const user = userEvent.setup();
    await user.click(await screen.findByText('My Listed Book'));
    await user.click(screen.getByRole('button', { name: 'List for Sale' }));

    await waitFor(() => {
      expect(mocks.pushToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Listing failed',
          message: 'This book is already listed in the marketplace.',
          tone: 'error',
        }),
      );
    });

    expect(screen.getByText('Listing failed')).toBeInTheDocument();
    expect(
      screen.getByText('This book is already listed in the marketplace.'),
    ).toBeInTheDocument();
  });
});
