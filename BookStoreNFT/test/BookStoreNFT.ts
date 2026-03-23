import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAddress } from "viem";

import { network } from "hardhat";

describe("BookStoreNFT", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [alice] = await viem.getWalletClients();

  it("mints a book NFT, stores the token URI, and increments the token id", async function () {
    const nft = await viem.deployContract("BookStoreNFT");
    const nftAsAlice = await viem.getContractAt("BookStoreNFT", nft.address, {
      client: { public: publicClient, wallet: alice },
    });

    await viem.assertions.emitWithArgs(
      nftAsAlice.write.mintEBook(["ipfs://book-1"]),
      nft,
      "EBookMinted",
      [0n, getAddress(alice.account.address)],
    );

    assert.equal(await nft.read.nextTokenId(), 1n);
    assert.equal(await nft.read.ownerOf([0n]), getAddress(alice.account.address));
    assert.equal(await nft.read.tokenURI([0n]), "ipfs://book-1");
  });

  it("reverts when minting with an empty metadata URI", async function () {
    const nft = await viem.deployContract("BookStoreNFT");
    const nftAsAlice = await viem.getContractAt("BookStoreNFT", nft.address, {
      client: { public: publicClient, wallet: alice },
    });

    await viem.assertions.revertWithCustomError(
      nftAsAlice.write.mintEBook([""]),
      nft,
      "EmptyMetadataURI",
    );
  });
});
