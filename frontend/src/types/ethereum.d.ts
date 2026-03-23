interface Window {
  ethereum?: {
    request: <T = unknown>(args: { method: string; params?: unknown[] }) => Promise<T>;
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    isMetaMask?: boolean;
  };
}
