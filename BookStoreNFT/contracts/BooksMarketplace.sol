// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BooksMarketplace is ReentrancyGuard {
    struct Listing {
        uint96 price;
        address seller;
    }

    error PriceMustBeGreaterThanZero();
    error PriceExceedsMax();
    error NotTokenOwner();
    error AlreadyListed();
    error ItemNotListed();
    error MarketplaceNotApproved();
    error IncorrectPriceSent(uint256 expected, uint256 received);
    error CannotBuyOwnBook();
    error SellerNoLongerOwnsToken();
    error NotSeller();
    error TransferToSellerFailed();

    mapping(address => mapping(uint256 => Listing)) public listings;

    event BookListed(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event BookSold(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );

    event ListingCancelled(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller
    );

    function listBook(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant {
        if (price == 0) {
            revert PriceMustBeGreaterThanZero();
        }

        if (price > type(uint96).max) {
            revert PriceExceedsMax();
        }

        IERC721 nft = IERC721(nftContract);
        if (nft.ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        Listing memory existingListing = listings[nftContract][tokenId];
        if (existingListing.price > 0 && existingListing.seller == msg.sender) {
            revert AlreadyListed();
        }

        if (!_isMarketplaceApproved(nft, msg.sender, tokenId)) {
            revert MarketplaceNotApproved();
        }

        listings[nftContract][tokenId] = Listing({
            price: uint96(price),
            seller: msg.sender
        });

        emit BookListed(nftContract, tokenId, msg.sender, price);
    }

    function buyBook(
        address nftContract,
        uint256 tokenId
    ) external payable nonReentrant {
        Listing memory item = listings[nftContract][tokenId];
        if (item.price == 0) {
            revert ItemNotListed();
        }

        if (msg.value != item.price) {
            revert IncorrectPriceSent(item.price, msg.value);
        }

        if (msg.sender == item.seller) {
            revert CannotBuyOwnBook();
        }

        IERC721 nft = IERC721(nftContract);
        if (nft.ownerOf(tokenId) != item.seller) {
            revert SellerNoLongerOwnsToken();
        }

        if (!_isMarketplaceApproved(nft, item.seller, tokenId)) {
            revert MarketplaceNotApproved();
        }

        delete listings[nftContract][tokenId];

        nft.safeTransferFrom(item.seller, msg.sender, tokenId);

        (bool success, ) = payable(item.seller).call{value: msg.value}("");
        if (!success) {
            revert TransferToSellerFailed();
        }

        emit BookSold(nftContract, tokenId, msg.sender, item.seller, msg.value);
    }

    function cancelListing(address nftContract, uint256 tokenId) external {
        Listing memory item = listings[nftContract][tokenId];
        if (item.price == 0) {
            revert ItemNotListed();
        }

        if (item.seller != msg.sender) {
            revert NotSeller();
        }

        delete listings[nftContract][tokenId];

        emit ListingCancelled(nftContract, tokenId, msg.sender);
    }

    function _isMarketplaceApproved(
        IERC721 nft,
        address owner,
        uint256 tokenId
    ) internal view returns (bool) {
        return
            nft.isApprovedForAll(owner, address(this)) ||
            nft.getApproved(tokenId) == address(this);
    }
}
