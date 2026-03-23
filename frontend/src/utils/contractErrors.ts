import { Interface } from 'ethers';

const MARKETPLACE_ERROR_ABI = [
  'error PriceMustBeGreaterThanZero()',
  'error PriceExceedsMax()',
  'error NotTokenOwner()',
  'error AlreadyListed()',
  'error ItemNotListed()',
  'error MarketplaceNotApproved()',
  'error IncorrectPriceSent(uint256 expected, uint256 received)',
  'error CannotBuyOwnBook()',
  'error SellerNoLongerOwnsToken()',
  'error NotSeller()',
  'error TransferToSellerFailed()',
] as const;

const MARKETPLACE_ERROR_MESSAGES: Record<string, string> = {
  PriceMustBeGreaterThanZero: 'Set a price greater than 0 ETH before listing this book.',
  PriceExceedsMax: 'The listing price is too large for the marketplace contract.',
  NotTokenOwner: 'Only the current owner can list this book for sale.',
  AlreadyListed: 'This book is already listed in the marketplace.',
  ItemNotListed: 'This book is no longer listed in the marketplace.',
  MarketplaceNotApproved: 'Approve the marketplace to manage this book before continuing.',
  IncorrectPriceSent: 'The transaction value does not match the active listing price.',
  CannotBuyOwnBook: 'You cannot buy your own listed book.',
  SellerNoLongerOwnsToken: 'The seller no longer owns this book, so the listing is invalid.',
  NotSeller: 'Only the seller who created this listing can remove it.',
  TransferToSellerFailed: 'The payment could not be sent to the seller. Please try again.',
};

const marketplaceErrors = new Interface(MARKETPLACE_ERROR_ABI);

function extractRevertName(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const revertName = (error as { revert?: { name?: unknown } }).revert?.name;
  return typeof revertName === 'string' ? revertName : null;
}

function extractErrorData(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const candidates = [
    (error as { data?: unknown }).data,
    (error as { error?: { data?: unknown } }).error?.data,
    (error as { info?: { error?: { data?: unknown } } }).info?.error?.data,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('0x')) {
      return candidate;
    }
  }

  return null;
}

function extractErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function getMarketplaceErrorName(error: unknown): string | null {
  const revertName = extractRevertName(error);
  if (revertName && MARKETPLACE_ERROR_MESSAGES[revertName]) {
    return revertName;
  }

  const errorData = extractErrorData(error);
  if (!errorData) {
    return null;
  }

  try {
    const decoded = marketplaceErrors.parseError(errorData);
    return decoded?.name ?? null;
  } catch {
    return null;
  }
}

export function getMarketplaceErrorMessage(error: unknown): string | null {
  const errorName = getMarketplaceErrorName(error);
  if (errorName && MARKETPLACE_ERROR_MESSAGES[errorName]) {
    return MARKETPLACE_ERROR_MESSAGES[errorName];
  }

  return null;
}

export function logHandledContractError(context: string, error: unknown) {
  const errorName = getMarketplaceErrorName(error);
  const message = getMarketplaceErrorMessage(error);

  if (errorName && message) {
    const code = extractErrorCode(error);
    const codeSuffix = code ? ` [${code}]` : '';
    console.warn(`${context}: ${errorName}${codeSuffix} - ${message}`);
    return;
  }

  console.error(context, error);
}
