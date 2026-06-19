export const secureOtaRegistryAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "version",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "sha256Hash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "downloadUrl",
        "type": "string"
      }
    ],
    "name": "FirmwarePublished",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_version",
        "type": "uint256"
      }
    ],
    "name": "getRelease",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "version",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "sha256Hash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "downloadUrl",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "latestVersion",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_version",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "_hash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "_url",
        "type": "string"
      }
    ],
    "name": "publishRelease",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
