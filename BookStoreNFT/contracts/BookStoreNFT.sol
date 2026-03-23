// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BookStoreNFT is ERC721URIStorage {
    uint256 public nextTokenId;

    error EmptyMetadataURI();

    event EBookMinted(
        uint256 indexed tokenId,
        address indexed author
    );

    constructor() ERC721("ElmerBookStore", "EBOOK") {}

    function mintEBook(string calldata metadataURI) external {
        if (bytes(metadataURI).length == 0) {
            revert EmptyMetadataURI();
        }

        uint256 tokenId = nextTokenId;
        unchecked {
            ++nextTokenId;
        }

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit EBookMinted(tokenId, msg.sender);
    }
}
