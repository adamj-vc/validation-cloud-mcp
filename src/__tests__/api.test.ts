import { ValidationCloudAPI } from '../api.js';
import axios from 'axios';
import { ValidationCloudError, EthereumErrorCode } from '../types.js';

jest.mock('axios');

describe('ValidationCloudAPI', () => {
    const mockApiKey = 'test-api-key';
    let api: ValidationCloudAPI;
    let mockAxiosInstance: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAxiosInstance = {
            post: jest.fn(),
            interceptors: {
                request: {
                    use: jest.fn()
                },
                response: {
                    use: jest.fn()
                }
            }
        };
        (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
        api = new ValidationCloudAPI({ apiKey: mockApiKey });
    });

    describe('constructor', () => {
        it('should throw error when API key is missing', () => {
            expect(() => new ValidationCloudAPI({} as any)).toThrow('API key is required');
        });

        it('should create instance with default config', () => {
            expect(axios.create).toHaveBeenCalledWith({
                baseURL: 'https://mainnet.ethereum.validationcloud.io/v1/test-api-key',
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        });
    });

    describe('request', () => {
        const mockResponse = {
            data: {
                jsonrpc: '2.0',
                id: 1,
                result: '0x1234'
            }
        };

        it('should make POST request with correct JSON-RPC format', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);
            await api.request({ method: 'eth_blockNumber' });

            const lastCall = mockAxiosInstance.post.mock.calls[0];
            expect(lastCall[0]).toBe('');
            expect(lastCall[1]).toMatchObject({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: []
            });
            expect(typeof lastCall[1].id).toBe('number');
        });

        it('should validate eth_getBalance parameters', async () => {
            await expect(api.request({
                method: 'eth_getBalance',
                params: ['invalid-address', 'latest']
            })).rejects.toThrow(new ValidationCloudError(
                'Invalid address parameter',
                EthereumErrorCode.INVALID_PARAMS
            ));

            await expect(api.request({
                method: 'eth_getBalance',
                params: ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e']
            })).rejects.toThrow(new ValidationCloudError(
                'eth_getBalance requires address and block parameters',
                EthereumErrorCode.INVALID_PARAMS
            ));
        });

        it('should validate eth_getTransactionByHash parameters', async () => {
            await expect(api.request({
                method: 'eth_getTransactionByHash',
                params: ['invalid-hash']
            })).rejects.toThrow(new ValidationCloudError(
                'Invalid transaction hash parameter',
                EthereumErrorCode.INVALID_PARAMS
            ));
        });

        it('should validate eth_getLogs parameters', async () => {
            await expect(api.request({
                method: 'eth_getLogs',
                params: ['invalid-filter']
            })).rejects.toThrow(new ValidationCloudError(
                'eth_getLogs requires a filter object parameter',
                EthereumErrorCode.INVALID_PARAMS
            ));
        });

        it('should handle successful eth_getBalance request', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);
            const result = await api.request({
                method: 'eth_getBalance',
                params: ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'latest']
            });
            expect(result).toEqual(mockResponse.data);
        });
    });

    describe('error handling', () => {
        it('should handle API errors', async () => {
            const mockError = {
                response: {
                    status: 400,
                    data: {
                        message: 'Invalid request',
                        details: { error: 'Bad parameters' }
                    }
                }
            };

            mockAxiosInstance.post.mockRejectedValueOnce(mockError);

            await expect(api.request({ method: 'eth_blockNumber' }))
                .rejects
                .toThrow(ValidationCloudError);
        });
    });

    describe('testConnection', () => {
        it('should return true when eth_blockNumber request succeeds', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: { jsonrpc: '2.0', id: 1, result: '0x1234' }
            });
            const result = await api.testConnection();
            expect(result).toBe(true);
        });

        it('should return false when request fails', async () => {
            mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));
            const result = await api.testConnection();
            expect(result).toBe(false);
        });
    });
});
