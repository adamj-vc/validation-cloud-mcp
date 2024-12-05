/**
 * Custom error class for Validation Cloud API errors
 */
export class ValidationCloudError extends Error {
    /** HTTP status code if applicable */
    code?: number;
    /** Additional error details */
    details?: Record<string, any>;

    constructor(message: string, code?: number, details?: Record<string, any>) {
        super(message);
        this.name = 'ValidationCloudError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Configuration options for the Validation Cloud API client
 */
export interface ValidationCloudConfig {
    /** Validation Cloud API key */
    apiKey: string;
    /** Optional base URL override */
    baseURL?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
}

/**
 * Standard Ethereum JSON-RPC method parameters
 */
export type EthereumParams = {
    /** Get the current block number */
    eth_blockNumber: [];
    /** Get the balance of an address */
    eth_getBalance: [address: string, block: string | number];
    /** Get transaction by hash */
    eth_getTransactionByHash: [hash: string];
    /** Get block by number */
    eth_getBlockByNumber: [block: string | number, includeTransactions: boolean];
    /** Get block by hash */
    eth_getBlockByHash: [hash: string, includeTransactions: boolean];
    /** Get transaction receipt */
    eth_getTransactionReceipt: [hash: string];
    /** Get code at address */
    eth_getCode: [address: string, block: string | number];
    /** Get network version */
    net_version: [];
    /** Get current gas price */
    eth_gasPrice: [];
    /** Get logs matching filter */
    eth_getLogs: [{
        fromBlock?: string | number;
        toBlock?: string | number;
        address?: string | string[];
        topics?: (string | string[] | null)[];
    }];
    /** Send raw transaction */
    eth_sendRawTransaction: [signedTransactionData: string];
    /** Call contract method */
    eth_call: [
        {
            from?: string;
            to: string;
            gas?: string;
            gasPrice?: string;
            value?: string;
            data?: string;
        },
        block: string | number
    ];
    /** Estimate gas for transaction */
    eth_estimateGas: [{
        from?: string;
        to?: string;
        gas?: string;
        gasPrice?: string;
        value?: string;
        data?: string;
    }];
    /** Get transaction count for address */
    eth_getTransactionCount: [address: string, block: string | number];
    [key: string]: any[]; // Allow other methods
};

/**
 * Parameters for Ethereum node requests
 */
export interface NodeRequestParams {
    /** JSON-RPC method to call */
    method: keyof EthereumParams;
    /** Parameters for the method */
    params?: any[];
}

/**
 * Response from Validation Cloud API
 */
export interface ValidationCloudResponse {
    /** JSON-RPC response id */
    id: number;
    /** JSON-RPC version */
    jsonrpc: string;
    /** Response result */
    result?: any;
    /** Error information if request failed */
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

/**
 * Standard Ethereum JSON-RPC error codes
 */
export enum EthereumErrorCode {
    /** Invalid JSON was received by the server */
    PARSE_ERROR = -32700,
    /** Invalid method parameter(s) */
    INVALID_PARAMS = -32602,
    /** Method not found */
    METHOD_NOT_FOUND = -32601,
    /** Internal JSON-RPC error */
    INTERNAL_ERROR = -32603,
    /** Server error */
    SERVER_ERROR = -32000
}
