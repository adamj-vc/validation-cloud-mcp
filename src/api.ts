import axios, { AxiosInstance } from 'axios';
import {
    ValidationCloudConfig,
    ValidationCloudError,
    NodeRequestParams,
    ValidationCloudResponse,
    EthereumParams,
    EthereumErrorCode
} from './types.js';
import { transformResponse } from './utils.js';

/**
 * Client for interacting with the Validation Cloud API
 * @example
 * ```typescript
 * const client = new ValidationCloudAPI({ apiKey: 'your-api-key' });
 * const response = await client.request({ method: 'eth_blockNumber' });
 * ```
 */
export class ValidationCloudAPI {
    private readonly client: AxiosInstance;
    private static readonly DEFAULT_BASE_URL = 'https://mainnet.ethereum.validationcloud.io/v1';
    private static readonly DEFAULT_TIMEOUT = 30000;

    /**
     * Creates a new Validation Cloud API client
     * @param config - Configuration options
     * @throws {Error} When API key is missing
     */
    constructor(config: ValidationCloudConfig) {
        if (!config.apiKey) {
            throw new Error('API key is required');
        }

        // Construct the URL with the API key
        const baseUrl = `${config.baseURL || ValidationCloudAPI.DEFAULT_BASE_URL}/${config.apiKey}`;

        console.error('[ValidationCloudAPI] Initializing with config:', {
            baseURL: baseUrl.replace(config.apiKey, '[HIDDEN]'), // Hide key in logs
            timeout: config.timeout || ValidationCloudAPI.DEFAULT_TIMEOUT
        });

        this.client = axios.create({
            baseURL: baseUrl,
            timeout: config.timeout || ValidationCloudAPI.DEFAULT_TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add response interceptor for error handling and logging
        this.client.interceptors.request.use(
            (config) => {
                console.error('[ValidationCloudAPI] Making request:', {
                    url: config.url?.replace(config.baseURL || '', '[BASE_URL]'), // Hide key in logs
                    method: config.method,
                    data: config.data
                });
                return config;
            },
            (error) => {
                console.error('[ValidationCloudAPI] Request error:', error);
                return Promise.reject(error);
            }
        );

        this.client.interceptors.response.use(
            (response) => {
                console.error('[ValidationCloudAPI] Received response:', {
                    status: response.status,
                    data: response.data
                });
                return response;
            },
            (error) => {
                console.error('[ValidationCloudAPI] Response error:', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status
                });
                throw new ValidationCloudError(
                    error.response?.data?.message || error.message,
                    error.response?.status,
                    error.response?.data
                );
            }
        );
    }

    /**
     * Validate parameters for a specific Ethereum JSON-RPC method
     * @param method - The method to validate parameters for
     * @param params - The parameters to validate
     * @throws {ValidationCloudError} If parameters are invalid
     */
    private validateParams(method: keyof EthereumParams, params?: any[]): void {
        // Special validation for common methods
        switch (method) {
            case 'eth_getBalance':
                if (!params || params.length !== 2) {
                    throw new ValidationCloudError(
                        'eth_getBalance requires address and block parameters',
                        EthereumErrorCode.INVALID_PARAMS
                    );
                }
                if (typeof params[0] !== 'string' || !params[0].startsWith('0x')) {
                    throw new ValidationCloudError(
                        'Invalid address parameter',
                        EthereumErrorCode.INVALID_PARAMS
                    );
                }
                break;

            case 'eth_getTransactionByHash':
                if (!params || params.length !== 1 || typeof params[0] !== 'string' || !params[0].startsWith('0x')) {
                    throw new ValidationCloudError(
                        'Invalid transaction hash parameter',
                        EthereumErrorCode.INVALID_PARAMS
                    );
                }
                break;

            case 'eth_getLogs':
                if (!params || params.length !== 1 || typeof params[0] !== 'object') {
                    throw new ValidationCloudError(
                        'eth_getLogs requires a filter object parameter',
                        EthereumErrorCode.INVALID_PARAMS
                    );
                }
                break;
        }
    }

    /**
     * Make a JSON-RPC request to the Ethereum node
     * @param params - Request parameters
     * @returns Promise resolving to API response with transformed values
     * @throws {ValidationCloudError} On API errors
     */
    async request(params: NodeRequestParams): Promise<ValidationCloudResponse> {
        console.error('[ValidationCloudAPI] Making JSON-RPC request:', {
            method: params.method,
            params: params.params
        });

        // Validate parameters
        this.validateParams(params.method, params.params);

        const requestBody = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: params.method,
            params: params.params || []
        };

        console.error('[ValidationCloudAPI] Request body:', requestBody);

        try {
            const response = await this.client.post<ValidationCloudResponse>('', requestBody);

            // Transform the response data
            if (response.data.result !== undefined) {
                response.data.result = transformResponse(params.method, response.data.result);
            }

            console.error('[ValidationCloudAPI] Transformed response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[ValidationCloudAPI] Request failed:', error);
            throw error;
        }
    }

    /**
     * Test API connectivity and credentials
     * @returns Promise resolving to boolean indicating success
     */
    async testConnection(): Promise<boolean> {
        try {
            console.error('[ValidationCloudAPI] Testing connection...');
            await this.request({ method: 'eth_blockNumber' });
            console.error('[ValidationCloudAPI] Connection test successful');
            return true;
        } catch (error) {
            console.error('[ValidationCloudAPI] Connection test failed:', error);
            return false;
        }
    }
}
