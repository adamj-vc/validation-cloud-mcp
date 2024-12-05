# Validation Cloud MCP Server

An MCP server implementation for interacting with Validation Cloud's Ethereum Node API, with automatic conversion of hex values to decimal.


## Requirements:

- An Anthropic account (create one if you don't have it)

- Cluade desktop app

- Validation cloud API key for ethereum 

- node@20

#### 
## Setup 
1. Find Node Path
Find your node path by running

```bash
which node
```
The output will be your "command" value for the configuration.

2. Set Up Validation Cloud MCP
   
Clone and build the repository:
  

```bash
git clone https://github.com/adamj-vc/validation-cloud-mcp.git
cd validation-cloud-mcp
npm install
npm run build
pwd
```

Take the output from pwd and append /build/index.js to it. This will be your "args" value.

3. Configure Claude
   
```bash
vi ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add this configuration (replace COMMAND and ARGS with your values from steps 1 and 2):
```json
{
  "mcpServers": {
    "validation-cloud": {
      "command": "COMMAND",
      "args": [
        "ARGS"
      ],
      "env": {
        "VALIDATION_CLOUD_API_KEY": ""
      }
    }
  }
}
```

For example, if:

`which node` outputs `/opt/homebrew/opt/node@20/bin/node`

`pwd` outputs `/Users/username/validation-cloud-mcp`

Your final configuration would look like:

```json
{
  "mcpServers": {
    "validation-cloud": {
      "command": "/opt/homebrew/opt/node@20/bin/node",
      "args": [
        "/Users/username/validation-cloud-mcp/build/index.js"
      ],
      "env": {
        "VALIDATION_CLOUD_API_KEY": ""
      }
    }
  }
}
```

## Available Methods

The server supports standard Ethereum JSON-RPC methods with automatic conversion of hex values to decimal. Here are some common examples:

### Get Latest Block Number
```json
{
  "tool": "ethereum_request",
  "arguments": {
    "method": "eth_blockNumber"
  }
}
// Returns decimal number instead of hex
```

### Get Account Balance
```json
{
  "tool": "ethereum_request",
  "arguments": {
    "method": "eth_getBalance",
    "params": ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "latest"]
  }
}
// Returns both wei and ether values in decimal:
// {
//   "wei": "1000000000000000000",
//   "ether": "1.0"
// }
```

### Get Transaction
```json
{
  "tool": "ethereum_request",
  "arguments": {
    "method": "eth_getTransactionByHash",
    "params": ["0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b"]
  }
}
// Returns transaction with numeric values in decimal
```

### Get Block
```json
{
  "tool": "ethereum_request",
  "arguments": {
    "method": "eth_getBlockByNumber",
    "params": ["latest", true]
  }
}
// Returns block with numeric values in decimal
```

### Query Logs
```json
{
  "tool": "ethereum_request",
  "arguments": {
    "method": "eth_getLogs",
    "params": [{
      "fromBlock": "0x0",
      "toBlock": "latest",
      "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    }]
  }
}
```

## Value Conversions

The server automatically converts hex values to decimal for better readability:

- Block numbers are converted to decimal numbers
- Gas values (gasPrice, gasLimit, gasUsed) are converted to decimal
- Wei values are provided in both wei (decimal string) and ether (decimal string)
- Timestamps are converted to decimal
- Transaction values include both wei and ether representations
- Block and transaction indexes are converted to decimal

## Supported Methods

The server supports all standard Ethereum JSON-RPC methods including:

- `eth_blockNumber`: Get current block number (returns decimal)
- `eth_getBalance`: Get account balance (returns wei and ether in decimal)
- `eth_getTransactionByHash`: Get transaction details (numeric values in decimal)
- `eth_getBlockByNumber`: Get block by number (numeric values in decimal)
- `eth_getBlockByHash`: Get block by hash (numeric values in decimal)
- `eth_getTransactionReceipt`: Get transaction receipt (numeric values in decimal)
- `eth_getCode`: Get contract code
- `net_version`: Get network version
- `eth_gasPrice`: Get current gas price (returns decimal)
- `eth_getLogs`: Query event logs
- `eth_sendRawTransaction`: Send signed transaction
- `eth_call`: Call contract method
- `eth_estimateGas`: Estimate transaction gas (returns decimal)
- `eth_getTransactionCount`: Get account nonce (returns decimal)

## Error Handling

The server handles standard Ethereum JSON-RPC error codes:

- `-32700`: Parse error
- `-32602`: Invalid params
- `-32601`: Method not found
- `-32603`: Internal error
- `-32000`: Server error

## Development

### Running Tests
```bash
npm test
```

### MCP inspector 

Run the server using the MCP inspector:
```bash
npm run inspector
```

### Watch Mode
```bash
npm run watch
```

## License

This project is licensed under the terms of the LICENSE file included in the repository.
