// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SecureOTARegistry {
    address public admin;

    struct FirmwareRelease {
        uint256 version;
        bytes32 sha256Hash;
        uint256 timestamp;
        string downloadUrl;
    }

    mapping(uint256 => FirmwareRelease) private _releases;
    uint256 public latestVersion;

    event FirmwarePublished(uint256 indexed version, bytes32 sha256Hash, string downloadUrl);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller is not the authorized administrator");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function publishRelease(uint256 _version, bytes32 _hash, string memory _url) external onlyAdmin {
        require(_version > latestVersion, "Version must be monotonic increasing");
        require(_hash != bytes32(0), "Invalid cryptographic hash identity");
        
        _releases[_version] = FirmwareRelease({
            version: _version,
            sha256Hash: _hash,
            timestamp: block.timestamp,
            downloadUrl: _url
        });
        
        latestVersion = _version;
        emit FirmwarePublished(_version, _hash, _url);
    }

    function getRelease(uint256 _version) external view returns (uint256 version, bytes32 sha256Hash, string memory downloadUrl) {
        FirmwareRelease memory release = _releases[_version];
        require(release.version != 0, "Requested firmware release does not exist");
        return (release.version, release.sha256Hash, release.downloadUrl);
    }
}
