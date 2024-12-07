import { EthereumParams } from './types.js';

/**
 * Convert a hex string to a decimal number
 * @param hex - Hex string (with or without '0x' prefix)
 * @returns Decimal number
 */
export function hexToDecimal(hex: string | null | undefined): number {
    if (!hex || hex === '0x') return 0;
    // Remove '0x' prefix if present and convert to decimal
    const cleanHex = hex.toString().replace('0x', '');
    const result = parseInt(cleanHex, 16);
    return isNaN(result) ? 0 : result;
}

/**
 * Convert a hex string to a decimal string (for large numbers)
 * @param hex - Hex string (with or without '0x' prefix)
 * @returns Decimal string
 */
export function hexToDecimalString(hex: string | null | undefined): string {
    if (!hex || hex === '0x') return '0';
    try {
        // Remove '0x' prefix if present
        const cleanHex = hex.toString().replace('0x', '');
        // Handle empty string after removing prefix
        if (!cleanHex) return '0';
        // Convert to decimal string (handles large numbers better than parseInt)
        return BigInt(`0x${cleanHex}`).toString();
    } catch (error) {
        return '0';
    }
}

/**
 * Convert Wei (in hex) to Ether (in decimal)
 * @param weiHex - Wei amount in hex
 * @returns Ether amount as string with 18 decimal places
 */
export function weiToEther(weiHex: string | null | undefined): string {
    if (!weiHex || weiHex === '0x') return '0';
    try {
        const wei = BigInt(weiHex);
        const ether = Number(wei) / 1e18;
        return ether.toString();
    } catch (error) {
        return '0';
    }
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
            if (typeof result !== 'string') return result;
            return {
                wei: hexToDecimalString(result),
                ether: weiToEther(result)
            };

        case 'eth_getBlockByNumber':
        case 'eth_getBlockByHash':
            if (typeof result === 'object') {
                return {
                    ...result,
                    ...(result.number && { number: hexToDecimal(result.number) }),
                    ...(result.gasLimit && { gasLimit: hexToDecimal(result.gasLimit) }),
                    ...(result.gasUsed && { gasUsed: hexToDecimal(result.gasUsed) }),
                    ...(result.timestamp && { timestamp: hexToDecimal(result.timestamp) }),
                    ...(result.transactions && {
                        transactions: Array.isArray(result.transactions)
                            ? result.transactions.map((tx: any) =>
                                typeof tx === 'object' ? transformTransaction(tx) : tx
                            )
                            : result.transactions
                    })
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
