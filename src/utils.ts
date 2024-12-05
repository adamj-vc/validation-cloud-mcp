import { EthereumParams } from './types.js';

/**
 * Convert a hex string to a decimal number
 * @param hex - Hex string (with or without '0x' prefix)
 * @returns Decimal number
 */
export function hexToDecimal(hex: string): number {
    if (!hex) return 0;
    // Remove '0x' prefix if present and convert to decimal
    return parseInt(hex.replace('0x', ''), 16);
}

/**
 * Convert a hex string to a decimal string (for large numbers)
 * @param hex - Hex string (with or without '0x' prefix)
 * @returns Decimal string
 */
export function hexToDecimalString(hex: string): string {
    if (!hex) return '0';
    // Remove '0x' prefix if present
    const cleanHex = hex.replace('0x', '');
    // Convert to decimal string (handles large numbers better than parseInt)
    return BigInt('0x' + cleanHex).toString();
}

/**
 * Convert Wei (in hex) to Ether (in decimal)
 * @param weiHex - Wei amount in hex
 * @returns Ether amount as string with 18 decimal places
 */
export function weiToEther(weiHex: string): string {
    if (!weiHex) return '0';
    const wei = BigInt(weiHex);
    const ether = Number(wei) / 1e18;
    return ether.toString();
}

/**
 * Transform API response based on the method
 * @param method - The Ethereum JSON-RPC method
 * @param result - The raw result from the API
 * @returns Transformed result
 */
export function transformResponse(method: keyof EthereumParams, result: any): any {
    if (!result) return result;

    switch (method) {
        case 'eth_blockNumber':
        case 'eth_gasPrice':
        case 'eth_estimateGas':
            return hexToDecimal(result);

        case 'eth_getBalance':
            return {
                wei: hexToDecimalString(result),
                ether: weiToEther(result)
            };

        case 'eth_getBlockByNumber':
        case 'eth_getBlockByHash':
            if (typeof result === 'object') {
                return {
                    ...result,
                    number: hexToDecimal(result.number),
                    gasLimit: hexToDecimal(result.gasLimit),
                    gasUsed: hexToDecimal(result.gasUsed),
                    timestamp: hexToDecimal(result.timestamp),
                    transactions: result.transactions.map((tx: any) =>
                        typeof tx === 'object' ? transformTransaction(tx) : tx
                    )
                };
            }
            return result;

        case 'eth_getTransactionByHash':
        case 'eth_getTransactionReceipt':
            return transformTransaction(result);

        default:
            return result;
    }
}

/**
 * Transform transaction object properties from hex to decimal
 * @param tx - Transaction object
 * @returns Transformed transaction object
 */
function transformTransaction(tx: any): any {
    if (!tx || typeof tx !== 'object') return tx;

    return {
        ...tx,
        blockNumber: tx.blockNumber ? hexToDecimal(tx.blockNumber) : null,
        transactionIndex: tx.transactionIndex ? hexToDecimal(tx.transactionIndex) : null,
        gas: hexToDecimal(tx.gas),
        gasPrice: tx.gasPrice ? hexToDecimal(tx.gasPrice) : null,
        nonce: hexToDecimal(tx.nonce),
        value: {
            wei: hexToDecimalString(tx.value),
            ether: weiToEther(tx.value)
        },
        ...(tx.gasUsed && { gasUsed: hexToDecimal(tx.gasUsed) }),
        ...(tx.cumulativeGasUsed && { cumulativeGasUsed: hexToDecimal(tx.cumulativeGasUsed) }),
        ...(tx.effectiveGasPrice && { effectiveGasPrice: hexToDecimal(tx.effectiveGasPrice) })
    };
}
