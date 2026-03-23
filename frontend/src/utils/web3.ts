import { BrowserProvider, Contract, type ContractRunner, type InterfaceAbi } from 'ethers';

const missingWalletMessage = 'MetaMask needs to be available in this browser.';

export function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error(missingWalletMessage);
  }

  return new BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = getBrowserProvider();
  const signer = await provider.getSigner();

  return { provider, signer };
}

export function getReadContract(address: string, abi: InterfaceAbi, runner?: ContractRunner) {
  return new Contract(address, abi, runner ?? getBrowserProvider());
}

export function createContract(address: string, abi: InterfaceAbi, runner: ContractRunner) {
  return new Contract(address, abi, runner);
}

export async function getWriteContract(address: string, abi: InterfaceAbi) {
  const { provider, signer } = await getSigner();
  const contract = createContract(address, abi, signer);

  return { provider, signer, contract };
}
