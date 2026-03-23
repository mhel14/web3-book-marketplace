// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BookStoreNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 public nextTokenId;

    event EBookMinted(
        uint256 indexed nextTokenId,
        address indexed author,
        string metadataURI
    );

    constructor() ERC721("ElmerBookStore", "EBOOK") Ownable(msg.sender) {}

    function mintEBook(string calldata _metadataURI) external nonReentrant {
        uint256 tokenId = nextTokenId;
        unchecked {
            ++nextTokenId;
        }
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _metadataURI);
        emit EBookMinted(tokenId, msg.sender, _metadataURI);
    }
}
