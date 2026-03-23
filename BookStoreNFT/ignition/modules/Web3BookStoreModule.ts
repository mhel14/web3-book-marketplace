import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('Web3BookStoreModule', (m) => {
  const bookStoreNFT = m.contract('BookStoreNFT');
  const booksMarketplace = m.contract('BooksMarketplace');

  return { bookStoreNFT, booksMarketplace };
});
