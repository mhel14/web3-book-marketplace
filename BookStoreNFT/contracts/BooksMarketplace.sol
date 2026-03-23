// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BooksMarketplace is ReentrancyGuard, Ownable, IERC721Receiver {
    struct Listing {
        uint256 price;
        address seller;
    }

    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // Mapping from NFT Contract Address -> Token ID -> Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // Events for frontend indexing
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

    constructor() Ownable(msg.sender) {}

    // List Book for Sale - User must call NFT contract approve() before this
    function listBook(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price
    ) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        require(
            IERC721(_nftContract).isApprovedForAll(msg.sender, address(this)) ||
                IERC721(_nftContract).getApproved(_tokenId) == address(this),
            "Marketplace not approved"
        );

        listings[_nftContract][_tokenId] = Listing({
            price: _price,
            seller: msg.sender
        });

        emit BookListed(_nftContract, _tokenId, msg.sender, _price);
    }

    function buyBook(
        address _nftContract,
        uint256 _tokenId
    ) external payable nonReentrant {
        Listing memory item = listings[_nftContract][_tokenId];

        require(item.price > 0, "Item not listed for sale");
        require(msg.value == item.price, "Incorrect price sent");
        require(msg.sender != item.seller, "Cannot buy your own book");

        // Cleanup listing first to prevent reentrancy
        delete listings[_nftContract][_tokenId];

        // Transfer ETH to Seller
        (bool success, ) = payable(item.seller).call{value: msg.value}("");
        require(success, "ETH Transfer to seller failed");

        // Transfer NFT to Buyer
        IERC721(_nftContract).safeTransferFrom(
            item.seller,
            msg.sender,
            _tokenId
        );

        emit BookSold(
            _nftContract,
            _tokenId,
            msg.sender,
            item.seller,
            msg.value
        );
    }

    function cancelListing(
        address _nftContract,
        uint256 _tokenId
    ) external nonReentrant {
        Listing memory item = listings[_nftContract][_tokenId];

        require(item.seller == msg.sender, "You are not the seller");

        delete listings[_nftContract][_tokenId];

        emit ListingCancelled(_nftContract, _tokenId, msg.sender);
    }
}
