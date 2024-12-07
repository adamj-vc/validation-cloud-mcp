import axios, { AxiosInstance, AxiosError } from 'axios';
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
 * Interface for API error response data
 */
interface APIErrorResponse {
    message: string;
    [key: string]: any;
}

/**
 * Simple logger interface that can be implemented by users
 */
export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

/**
 * Default logger implementation using console
 */
class DefaultLogger implements Logger {
    debug(message: string, ...args: any[]): void {
        console.debug(`[ValidationCloudAPI] ${message}`, ...args);
    }

    info(message: string, ...args: any[]): void {
        console.log(`[ValidationCloudAPI] ${message}`, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[ValidationCloudAPI] ${message}`, ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(`[ValidationCloudAPI] ${message}`, ...args);
    }
}

export class ValidationCloudAPI {
    private readonly client: AxiosInstance;
    private readonly logger: Logger;
    private static readonly DEFAULT_BASE_URL = 'https://mainnet.ethereum.validationcloud.io/v1';
    private static readonly DEFAULT_TIMEOUT = 30000;

    constructor(config: ValidationCloudConfig & { logger?: Logger }) {
        if (!config.apiKey) {
            throw new Error('API key is required');
        }

        this.logger = config.logger || new DefaultLogger();
        const baseUrl = `${config.baseURL || ValidationCloudAPI.DEFAULT_BASE_URL}/${config.apiKey}`;

        this.logger.info('Initializing with config:', {
            baseURL: baseUrl.replace(config.apiKey, '[HIDDEN]'),
            timeout: config.timeout || ValidationCloudAPI.DEFAULT_TIMEOUT
        });

        this.client = axios.create({
            baseURL: baseUrl,
            timeout: config.timeout || ValidationCloudAPI.DEFAULT_TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.client.interceptors.request.use(
            (config) => {
                this.logger.debug('Making request:', {
                    url: config.url?.replace(config.baseURL || '', '[BASE_URL]'),
                    method: config.method,
                    data: config.data
                });
                return config;
            }
        );

        this.client.interceptors.response.use(
            (response) => {
                this.logger.debug('Received response:', {
                    status: response.status,
                    data: response.data
                });
                return response;
            }
        );
    }

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

    async request(params: NodeRequestParams): Promise<ValidationCloudResponse> {
        try {
            this.logger.debug('Making JSON-RPC request:', {
                method: params.method,
                params: params.params
            });

            this.validateParams(params.method, params.params);

            const requestBody = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: params.method,
                params: params.params || []
            };

            this.logger.debug('Request body:', requestBody);

            const response = await this.client.post<ValidationCloudResponse>('', requestBody);

            if (response.data.result !== undefined) {
                response.data.result = transformResponse(params.method, response.data.result);
            }

            this.logger.debug('Transformed response:', response.data);
            return response.data;
        } catch (error) {
            this.logger.error('Request failed:', error);

            // Handle Axios errors
            if (axios.isAxiosError(error)) {
                throw new ValidationCloudError(
                    error.response?.data?.message || error.message,
                    error.response?.status,
                    error.response?.data as Record<string, any>
                );
            }

            // If it's already a ValidationCloudError, rethrow it
            if (error instanceof ValidationCloudError) {
                throw error;
            }

            // Handle other errors
            throw new ValidationCloudError(
                error instanceof Error ? error.message : 'Unknown error',
                undefined,
                undefined
            );
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            this.logger.info('Testing connection...');
            await this.request({ method: 'eth_blockNumber' });
            this.logger.info('Connection test successful');
            return true;
        } catch (error) {
            this.logger.error('Connection test failed:', error);
            return false;
        }
    }
}
