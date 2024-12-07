import axios, {
    AxiosInstance,
    AxiosError,
    AxiosResponse,
    InternalAxiosRequestConfig
} from 'axios';
import { ValidationCloudAPI } from '../api';
import { ValidationCloudError } from '../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create a complete mock axios instance with all required methods
const createMockAxiosInstance = (postImplementation: any) => {
    const requestInterceptorMock = {
        use: jest.fn(),
        eject: jest.fn(),
        clear: jest.fn()
    };

    const responseInterceptorMock = {
        use: jest.fn(),
        eject: jest.fn(),
        clear: jest.fn()
    };

    // Creating the mock Axios instance with all required methods
    const mockAxios = {
        defaults: {
            headers: {
                common: { 'Accept': 'application/json, text/plain, */*' },
                delete: {},
                get: {},
                head: {},
                post: { 'Content-Type': 'application/json' },
                put: { 'Content-Type': 'application/json' },
                patch: { 'Content-Type': 'application/json' },
                options: {}
            } as any,
            transformRequest: [],
            transformResponse: [],
            timeout: 0,
            xsrfCookieName: 'XSRF-TOKEN',
            xsrfHeaderName: 'X-XSRF-TOKEN',
            maxContentLength: -1,
            maxBodyLength: -1,
            validateStatus: (status: number) => status >= 200 && status < 300,
        },
        interceptors: {
            request: requestInterceptorMock,
            response: responseInterceptorMock
        },
        getUri: jest.fn(),
        request: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
        head: jest.fn(),
        options: jest.fn(),
        post: postImplementation,
        put: jest.fn(),
        patch: jest.fn(),
        postForm: jest.fn(),
        putForm: jest.fn(),
        patchForm: jest.fn()
    };

    return mockAxios as unknown as AxiosInstance;
};

describe('ValidationCloudAPI', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Set up default mock implementation
        mockedAxios.create.mockReturnValue(
            createMockAxiosInstance(jest.fn().mockResolvedValue({ data: {} }))
        );
    });

    describe('constructor', () => {
        it('should throw error when API key is missing', () => {
            expect(() => new ValidationCloudAPI({} as any)).toThrow('API key is required');
        });

        it('should create instance with default config', () => {
            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            expect(api).toBeInstanceOf(ValidationCloudAPI);
        });
    });

    describe('request', () => {
        it('should handle successful eth_blockNumber request', async () => {
            mockedAxios.create.mockReturnValue(
                createMockAxiosInstance(
                    jest.fn().mockResolvedValue({
                        data: { jsonrpc: '2.0', id: 1, result: '0x1234' }
                    })
                )
            );

            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            const response = await api.request({ method: 'eth_blockNumber' });
            expect(response.result).toBe(4660); // 0x1234 in decimal
        });

        it('should handle successful eth_getBalance request', async () => {
            mockedAxios.create.mockReturnValue(
                createMockAxiosInstance(
                    jest.fn().mockResolvedValue({
                        data: { jsonrpc: '2.0', id: 1, result: '0xde0b6b3a7640000' }
                    })
                )
            );

            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            const response = await api.request({
                method: 'eth_getBalance',
                params: ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'latest']
            });

            expect(response.result).toEqual({
                wei: '1000000000000000000',
                ether: '1'
            });
        });

        it('should validate eth_getBalance parameters', async () => {
            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            await expect(
                api.request({
                    method: 'eth_getBalance',
                    params: ['invalid-address', 'latest']
                })
            ).rejects.toThrow('Invalid address parameter');
        });

        it('should validate eth_getTransactionByHash parameters', async () => {
            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            await expect(
                api.request({
                    method: 'eth_getTransactionByHash',
                    params: ['invalid-hash']
                })
            ).rejects.toThrow('Invalid transaction hash parameter');
        });

        it('should validate eth_getLogs parameters', async () => {
            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            await expect(
                api.request({
                    method: 'eth_getLogs',
                    params: ['invalid-filter' as any]
                })
            ).rejects.toThrow('eth_getLogs requires a filter object parameter');
        });
    });

    describe('error handling', () => {
        it('should handle API errors', async () => {
            const errorResponse = {
                response: {
                    data: { message: 'Invalid request' },
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    config: {} as any
                },
                config: {} as any,
                isAxiosError: true,
                status: 400,
                statusText: 'Bad Request',
                name: 'AxiosError',
                message: 'Request failed with status code 400',
                toJSON: () => ({})
            };

            // Create the mock implementation
            const mockPost = jest.fn().mockRejectedValue(errorResponse);

            // Set up the mock axios instance
            mockedAxios.create.mockReturnValue(
                createMockAxiosInstance(mockPost)
            );

            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            await expect(
                api.request({ method: 'eth_blockNumber' })
            ).rejects.toThrow(ValidationCloudError);
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network error');
            (networkError as any).isAxiosError = true;

            mockedAxios.create.mockReturnValue(
                createMockAxiosInstance(jest.fn().mockRejectedValue(networkError))
            );

            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            await expect(api.testConnection()).resolves.toBe(false);
        });
    });

    describe('testConnection', () => {
        it('should return true for successful connection', async () => {
            mockedAxios.create.mockReturnValue(
                createMockAxiosInstance(
                    jest.fn().mockResolvedValue({
                        data: { jsonrpc: '2.0', id: 1, result: '0x1' }
                    })
                )
            );

            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            const result = await api.testConnection();
            expect(result).toBe(true);
        });

        it('should return false for failed connection', async () => {
            mockedAxios.create.mockReturnValue(
                createMockAxiosInstance(jest.fn().mockRejectedValue(new Error('Connection failed')))
            );

            const api = new ValidationCloudAPI({ apiKey: 'test-key' });
            const result = await api.testConnection();
            expect(result).toBe(false);
        });
    });
});
