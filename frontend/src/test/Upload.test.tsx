import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pushToast: vi.fn(),
  mintBookNFT: vi.fn(),
  uploadFileToIPFS: vi.fn(),
  uploadJSONToIPFS: vi.fn(),
  walletState: {
    selectedAccount: '',
  },
}));

vi.mock('../context/WalletContext', () => ({
  useWallet: () => ({
    selectedAccount: mocks.walletState.selectedAccount,
    mintBookNFT: mocks.mintBookNFT,
  }),
}));

vi.mock('../components/ui/ToastProvider', () => ({
  useToast: () => ({ pushToast: mocks.pushToast }),
}));

vi.mock('../services/pinata', () => ({
  uploadFileToIPFS: mocks.uploadFileToIPFS,
  uploadJSONToIPFS: mocks.uploadJSONToIPFS,
}));

import Upload from '../pages/Upload';

describe('Upload page', () => {
  beforeEach(() => {
    mocks.pushToast.mockReset();
    mocks.mintBookNFT.mockReset();
    mocks.uploadFileToIPFS.mockReset();
    mocks.uploadJSONToIPFS.mockReset();
    mocks.walletState.selectedAccount = '';
  });

  it('shows wallet-required status when no account is connected', () => {
    render(<Upload />);

    expect(screen.getByText('Wallet required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Book' })).toBeDisabled();
  });

  it('uploads files and mints when form submission succeeds', async () => {
    mocks.walletState.selectedAccount = '0x1234567890abcdef1234567890abcdef12345678';
    mocks.uploadFileToIPFS.mockResolvedValueOnce('cover-cid').mockResolvedValueOnce('book-cid');
    mocks.uploadJSONToIPFS.mockResolvedValue('meta-cid');
    mocks.mintBookNFT.mockResolvedValue(undefined);

    render(<Upload />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Book Title'), 'My Book');
    await user.type(screen.getByLabelText('Author'), 'Alice');
    await user.type(screen.getByLabelText('Genre'), 'Fiction');
    await user.type(screen.getByLabelText('Price (ETH)'), '0.05');

    const coverFile = new File(['cover'], 'cover.png', { type: 'image/png' });
    const pdfFile = new File(['pdf'], 'book.pdf', { type: 'application/pdf' });

    await user.upload(screen.getByLabelText('Cover Image'), coverFile);
    await user.upload(screen.getByLabelText('PDF Book'), pdfFile);
    await user.click(screen.getByRole('button', { name: 'Upload Book' }));

    await waitFor(() => {
      expect(mocks.uploadFileToIPFS).toHaveBeenCalledTimes(2);
      expect(mocks.uploadJSONToIPFS).toHaveBeenCalledTimes(1);
      expect(mocks.mintBookNFT).toHaveBeenCalledTimes(1);
      expect(mocks.pushToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Book published', tone: 'success' }),
      );
    });

    expect(screen.getByText('Upload complete')).toBeInTheDocument();
    expect(screen.getByText(/Published asset links/i)).toBeInTheDocument();
  });
});
