import { BrowserProvider, Contract } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createContract,
  getBrowserProvider,
  getReadContract,
  getSigner,
  getWriteContract,
} from '../utils/web3';

const account = '0x1234567890abcdef1234567890abcdef12345678';

describe('web3 helpers', () => {
  beforeEach(() => {
    const request: NonNullable<Window['ethereum']>['request'] = async ({ method }) => {
      switch (method) {
        case 'eth_chainId':
          return '0x1' as never;
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [account] as never;
        default:
          return null as never;
      }
    };

    window.ethereum = {
      request,
      on: vi.fn(),
      removeListener: vi.fn(),
    };
  });

  it('throws when metamask is unavailable', () => {
    window.ethereum = undefined;

    expect(() => getBrowserProvider()).toThrow('MetaMask needs to be available in this browser.');
  });

  it('creates a browser provider from window.ethereum', () => {
    const provider = getBrowserProvider();

    expect(provider).toBeInstanceOf(BrowserProvider);
  });

  it('returns signer and provider together', async () => {
    const result = await getSigner();

    expect(result.provider).toBeInstanceOf(BrowserProvider);
    expect((await result.signer.getAddress()).toLowerCase()).toBe(account.toLowerCase());
  });

  it('creates read contracts with the provider by default', () => {
    const contract = getReadContract('0x0000000000000000000000000000000000000001', ['function owner() view returns (address)']);

    expect(contract).toBeInstanceOf(Contract);
    expect(contract.target).toBe('0x0000000000000000000000000000000000000001');
  });

  it('creates write contracts with the signer', async () => {
    const result = await getWriteContract(
      '0x0000000000000000000000000000000000000002',
      ['function owner() view returns (address)'],
    );

    expect(result.provider).toBeInstanceOf(BrowserProvider);
    expect(result.contract).toBeInstanceOf(Contract);
    expect(result.contract.target).toBe('0x0000000000000000000000000000000000000002');
    expect((await result.signer.getAddress()).toLowerCase()).toBe(account.toLowerCase());
  });

  it('creates a contract with any provided runner', async () => {
    const { signer } = await getSigner();
    const contract = createContract(
      '0x0000000000000000000000000000000000000003',
      ['function owner() view returns (address)'],
      signer,
    );

    expect(contract).toBeInstanceOf(Contract);
    expect(contract.target).toBe('0x0000000000000000000000000000000000000003');
  });
});
