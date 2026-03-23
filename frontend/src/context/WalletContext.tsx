/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ethers, type InterfaceAbi } from 'ethers';

import { useToast } from '../components/ui/ToastProvider';
import { getBrowserProvider, getWriteContract } from '../utils/web3';

interface IMintBookNFT {
  (contractAddress: string, ABI: InterfaceAbi, metaCID: string): Promise<void>;
}

export interface IUseWallet {
  selectedAccount: string;
  accounts: string[];
  balance: string;
  error: string;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  updateAccount: (_address: string) => Promise<void>;
  clearError: () => void;
  mintBookNFT: IMintBookNFT;
}

const WalletContext = createContext<IUseWallet | undefined>(undefined);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while talking to your wallet.';
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export function WalletProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<string[]>([]);
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const { pushToast } = useToast();

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const updateAccount = useCallback(async (_address: string) => {
    if (!_address) {
      setSelectedAccount('');
      setBalance('');
      return;
    }

    setSelectedAccount(_address);

    if (!window.ethereum) {
      return;
    }

    try {
      const provider = getBrowserProvider();
      const balanceWei = await provider.getBalance(_address);
      setBalance(Number(ethers.formatEther(balanceWei)).toFixed(4));
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Unable to load wallet balance right now.');
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError('');

    if (!window.ethereum) {
      const message = 'MetaMask was not detected in this browser.';
      setError(message);
      pushToast({
        title: 'Wallet unavailable',
        message: 'Install MetaMask to connect and interact with the bookstore.',
        tone: 'error',
      });
      setIsConnecting(false);
      return;
    }

    try {
      const nextAccounts = await window.ethereum.request<string[]>({
        method: 'eth_requestAccounts',
      });

      if (!isStringArray(nextAccounts)) {
        throw new Error('Wallet returned an unexpected account payload.');
      }

      setAccounts(nextAccounts);
      if (nextAccounts.length > 0) {
        await updateAccount(nextAccounts[0]);
        pushToast({
          title: 'Wallet connected',
          message: 'Your wallet is ready for uploads, listings, and purchases.',
          tone: 'success',
        });
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      const message = getErrorMessage(err);
      setError(message);
      pushToast({
        title: 'Connection failed',
        message,
        tone: 'error',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [pushToast, updateAccount]);

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    const hydrateAccounts = async () => {
      try {
        const existingAccounts = await window.ethereum?.request<string[]>({
          method: 'eth_accounts',
        });
        if (isStringArray(existingAccounts) && existingAccounts.length > 0) {
          setAccounts(existingAccounts);
          await updateAccount(existingAccounts[0]);
        }
      } catch (err) {
        console.error('Unable to hydrate wallet accounts:', err);
      }
    };

    const handleAccountChange = async (...args: unknown[]) => {
      const [nextAccounts] = args;
      if (!isStringArray(nextAccounts)) {
        return;
      }

      setAccounts(nextAccounts);

      if (nextAccounts.length === 0) {
        setSelectedAccount('');
        setBalance('');
        pushToast({
          title: 'Wallet disconnected',
          message: 'Reconnect a wallet to continue managing books.',
          tone: 'info',
        });
        return;
      }

      await updateAccount(nextAccounts[0]);
      pushToast({
        title: 'Active account updated',
        message: 'Your selected wallet account changed successfully.',
        tone: 'info',
      });
    };

    hydrateAccounts();
    window.ethereum.on('accountsChanged', handleAccountChange);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountChange);
    };
  }, [pushToast, updateAccount]);

  const mintBookNFT = useCallback<IMintBookNFT>(
    async (contractAddress, ABI, metaCID) => {
      if (!window.ethereum) {
        const message = 'Wallet connection is required before minting.';
        setError(message);
        throw new Error(message);
      }

      try {
        const { contract } = await getWriteContract(contractAddress, ABI);
        const tx = await contract.mintEBook(metaCID);
        await tx.wait();

        pushToast({
          title: 'Mint complete',
          message: 'Your book NFT was minted successfully.',
          tone: 'success',
        });
      } catch (err) {
        console.error('Mint failed:', err);
        const message = getErrorMessage(err);
        setError(message);
        pushToast({
          title: 'Mint failed',
          message,
          tone: 'error',
        });
        throw new Error(message);
      }
    },
    [pushToast],
  );

  const value = useMemo<IUseWallet>(
    () => ({
      accounts,
      selectedAccount,
      balance,
      error,
      isConnecting,
      connectWallet,
      updateAccount,
      clearError,
      mintBookNFT,
    }),
    [
      accounts,
      selectedAccount,
      balance,
      error,
      isConnecting,
      connectWallet,
      updateAccount,
      clearError,
      mintBookNFT,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): IUseWallet {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }

  return context;
}
