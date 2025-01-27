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

export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

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
    private messageId = 1;

    constructor(config: ValidationCloudConfig & { logger?: Logger }) {
        if (!config.apiKey) {
            throw new Error('API key is required');
        }

        this.logger = config.logger || new DefaultLogger();
        const baseUrl = `${config.baseURL || ValidationCloudAPI.DEFAULT_BASE_URL}/${config.apiKey}`;

        this.client = axios.create({
            baseURL: baseUrl,
            timeout: config.timeout || ValidationCloudAPI.DEFAULT_TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    private validateParams(method: keyof EthereumParams, params?: any[]): void {
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
            this.validateParams(params.method, params.params);

            const requestBody = {
                jsonrpc: '2.0',
                id: this.messageId++,
                method: params.method,
                params: params.params || []
            };

            const response = await this.client.post<ValidationCloudResponse>('', requestBody);

            if (response.data.result !== undefined) {
                response.data.result = transformResponse(params.method, response.data.result);
            }

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new ValidationCloudError(
                    error.response?.data?.message || error.message,
                    error.response?.status,
                    error.response?.data as Record<string, any>
                );
            }

            if (error instanceof ValidationCloudError) {
                throw error;
            }

            throw new ValidationCloudError(
                error instanceof Error ? error.message : 'Unknown error',
                undefined,
                undefined
            );
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.request({ method: 'eth_blockNumber' });
            return true;
        } catch (error) {
            return false;
        }
    }
}