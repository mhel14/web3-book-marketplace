import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAddress, zeroAddress } from "viem";

import { network } from "hardhat";

const PRICE = 1_000_000_000_000_000_000n;
const TOO_HIGH_PRICE = 1n << 96n;

describe("BooksMarketplace", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [alice, bob] = await viem.getWalletClients();

  async function deployFixture() {
    const nft = await viem.deployContract("BookStoreNFT");
    const market = await viem.deployContract("BooksMarketplace");

    const nftAsAlice = await viem.getContractAt("BookStoreNFT", nft.address, {
      client: { public: publicClient, wallet: alice },
    });
    const nftAsBob = await viem.getContractAt("BookStoreNFT", nft.address, {
      client: { public: publicClient, wallet: bob },
    });
    const marketAsAlice = await viem.getContractAt("BooksMarketplace", market.address, {
      client: { public: publicClient, wallet: alice },
    });
    const marketAsBob = await viem.getContractAt("BooksMarketplace", market.address, {
      client: { public: publicClient, wallet: bob },
    });

    return {
      nft,
      market,
      nftAsAlice,
      nftAsBob,
      marketAsAlice,
      marketAsBob,
    };
  }

  async function mintApproveAndList() {
    const fixture = await deployFixture();

    await fixture.nftAsAlice.write.mintEBook(["ipfs://book-1"]);
    await fixture.nftAsAlice.write.setApprovalForAll([fixture.market.address, true]);
    await fixture.marketAsAlice.write.listBook([fixture.nft.address, 0n, PRICE]);

    return fixture;
  }

  it("lists a book only when the current owner approved the marketplace", async function () {
    const { nft, market, nftAsAlice, marketAsAlice } = await deployFixture();

    await nftAsAlice.write.mintEBook(["ipfs://book-1"]);
    await nftAsAlice.write.setApprovalForAll([market.address, true]);

    await viem.assertions.emitWithArgs(
      marketAsAlice.write.listBook([nft.address, 0n, PRICE]),
      market,
      "BookListed",
      [getAddress(nft.address), 0n, getAddress(alice.account.address), PRICE],
    );

    const listing = await market.read.listings([nft.address, 0n]);
    assert.equal(listing[0], PRICE);
    assert.equal(listing[1], getAddress(alice.account.address));
  });

  it("reverts when listing with a zero price", async function () {
    const { nft, market, nftAsAlice, marketAsAlice } = await deployFixture();

    await nftAsAlice.write.mintEBook(["ipfs://book-1"]);
    await nftAsAlice.write.setApprovalForAll([market.address, true]);

    await viem.assertions.revertWithCustomError(
      marketAsAlice.write.listBook([nft.address, 0n, 0n]),
      market,
      "PriceMustBeGreaterThanZero",
    );
  });

  it("reverts when listing with a price that exceeds the packed storage limit", async function () {
    const { nft, market, nftAsAlice, marketAsAlice } = await deployFixture();

    await nftAsAlice.write.mintEBook(["ipfs://book-1"]);

    await viem.assertions.revertWithCustomError(
      marketAsAlice.write.listBook([nft.address, 0n, TOO_HIGH_PRICE]),
      market,
      "PriceExceedsMax",
    );
  });

  it("reverts when the marketplace was not approved by the owner", async function () {
    const { nft, market, nftAsAlice, marketAsAlice } = await deployFixture();

    await nftAsAlice.write.mintEBook(["ipfs://book-1"]);

    await viem.assertions.revertWithCustomError(
      marketAsAlice.write.listBook([nft.address, 0n, PRICE]),
      market,
      "MarketplaceNotApproved",
    );
  });

  it("reverts when a non-owner tries to list a token", async function () {
    const { nft, market, nftAsAlice, marketAsBob } = await deployFixture();

    await nftAsAlice.write.mintEBook(["ipfs://book-1"]);

    await viem.assertions.revertWithCustomError(
      marketAsBob.write.listBook([nft.address, 0n, PRICE]),
      marketAsBob,
      "NotTokenOwner",
    );
  });

  it("reverts when the same seller tries to list an already active listing", async function () {
    const { nft, marketAsAlice } = await mintApproveAndList();

    await viem.assertions.revertWithCustomError(
      marketAsAlice.write.listBook([nft.address, 0n, PRICE]),
      marketAsAlice,
      "AlreadyListed",
    );
  });

  it("allows the new owner to replace a stale listing after a direct transfer", async function () {
    const { nft, market, nftAsAlice, nftAsBob, marketAsBob } = await mintApproveAndList();

    await nftAsAlice.write.transferFrom([
      alice.account.address,
      bob.account.address,
      0n,
    ]);
    await nftAsBob.write.setApprovalForAll([market.address, true]);

    await viem.assertions.emitWithArgs(
      marketAsBob.write.listBook([nft.address, 0n, PRICE]),
      market,
      "BookListed",
      [getAddress(nft.address), 0n, getAddress(bob.account.address), PRICE],
    );

    const listing = await market.read.listings([nft.address, 0n]);
    assert.equal(listing[1], getAddress(bob.account.address));
  });

  it("buys a listed book, clears the listing, and transfers ETH to the seller", async function () {
    const { nft, market, marketAsBob } = await mintApproveAndList();

    await viem.assertions.balancesHaveChanged(
      marketAsBob.write.buyBook([nft.address, 0n], {
        account: bob.account,
        value: PRICE,
      }),
      [{ address: alice.account.address, amount: PRICE }],
    );

    assert.equal(await nft.read.ownerOf([0n]), getAddress(bob.account.address));

    const listing = await market.read.listings([nft.address, 0n]);
    assert.equal(listing[0], 0n);
    assert.equal(listing[1], zeroAddress);
  });

  it("reverts when buying an unlisted book", async function () {
    const { nft, market, marketAsBob } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      marketAsBob.write.buyBook([nft.address, 0n], {
        account: bob.account,
        value: PRICE,
      }),
      market,
      "ItemNotListed",
    );
  });

  it("reverts when the buyer sends the wrong amount", async function () {
    const { nft, marketAsBob } = await mintApproveAndList();

    await viem.assertions.revertWithCustomErrorWithArgs(
      marketAsBob.write.buyBook([nft.address, 0n], {
        account: bob.account,
        value: PRICE - 1n,
      }),
      marketAsBob,
      "IncorrectPriceSent",
      [PRICE, PRICE - 1n],
    );
  });

  it("reverts when the seller tries to buy their own listing", async function () {
    const { nft, market, marketAsAlice } = await mintApproveAndList();

    await viem.assertions.revertWithCustomError(
      marketAsAlice.write.buyBook([nft.address, 0n], {
        account: alice.account,
        value: PRICE,
      }),
      market,
      "CannotBuyOwnBook",
    );
  });

  it("reverts when the listed seller no longer owns the token", async function () {
    const { nft, market, nftAsAlice, marketAsBob } = await mintApproveAndList();

    await nftAsAlice.write.transferFrom([
      alice.account.address,
      bob.account.address,
      0n,
    ]);

    await viem.assertions.revertWithCustomError(
      marketAsBob.write.buyBook([nft.address, 0n], {
        account: bob.account,
        value: PRICE,
      }),
      market,
      "SellerNoLongerOwnsToken",
    );
  });

  it("reverts when the seller revoked marketplace approval after listing", async function () {
    const { nft, market, nftAsAlice, marketAsBob } = await mintApproveAndList();

    await nftAsAlice.write.setApprovalForAll([market.address, false]);

    await viem.assertions.revertWithCustomError(
      marketAsBob.write.buyBook([nft.address, 0n], {
        account: bob.account,
        value: PRICE,
      }),
      market,
      "MarketplaceNotApproved",
    );
  });

  it("cancels a listing only when called by the seller", async function () {
    const { nft, market, marketAsAlice, marketAsBob } = await mintApproveAndList();

    await viem.assertions.revertWithCustomError(
      marketAsBob.write.cancelListing([nft.address, 0n]),
      marketAsBob,
      "NotSeller",
    );

    await viem.assertions.emitWithArgs(
      marketAsAlice.write.cancelListing([nft.address, 0n]),
      market,
      "ListingCancelled",
      [getAddress(nft.address), 0n, getAddress(alice.account.address)],
    );

    const listing = await market.read.listings([nft.address, 0n]);
    assert.equal(listing[0], 0n);
    assert.equal(listing[1], zeroAddress);
  });

  it("reverts when canceling an unlisted book", async function () {
    const { nft, market, marketAsAlice } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      marketAsAlice.write.cancelListing([nft.address, 0n]),
      market,
      "ItemNotListed",
    );
  });
});
