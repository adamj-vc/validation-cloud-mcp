import { hexToDecimal, hexToDecimalString, weiToEther, transformResponse } from '../utils';

describe('Utility Functions', () => {
    describe('hexToDecimal', () => {
        it('should convert hex strings to decimal numbers', () => {
            expect(hexToDecimal('0x1')).toBe(1);
            expect(hexToDecimal('0xa')).toBe(10);
            expect(hexToDecimal('0xff')).toBe(255);
            expect(hexToDecimal('0x0')).toBe(0);
        });

        it('should handle empty or invalid input', () => {
            expect(hexToDecimal('')).toBe(0);
            expect(hexToDecimal('0x')).toBe(0);
        });
    });

    describe('hexToDecimalString', () => {
        it('should convert hex strings to decimal strings', () => {
            expect(hexToDecimalString('0x1')).toBe('1');
            expect(hexToDecimalString('0xa')).toBe('10');
            // Test large numbers that would overflow Number
            expect(hexToDecimalString('0xffffffffffffffffffffffffffffffff'))
                .toBe('340282366920938463463374607431768211455');
        });

        it('should handle empty or invalid input', () => {
            expect(hexToDecimalString('')).toBe('0');
            expect(hexToDecimalString('0x')).toBe('0');
        });
    });

    describe('weiToEther', () => {
        it('should convert wei (hex) to ether (decimal string)', () => {
            // 1 ether = 1e18 wei
            expect(weiToEther('0xde0b6b3a7640000')).toBe('1');
            // 0.1 ether
            expect(weiToEther('0x16345785d8a0000')).toBe('0.1');
            // 0 ether
            expect(weiToEther('0x0')).toBe('0');
        });

        it('should handle empty input', () => {
            expect(weiToEther('')).toBe('0');
        });
    });

    describe('transformResponse', () => {
        it('should transform eth_blockNumber response', () => {
            expect(transformResponse('eth_blockNumber', '0xa')).toBe(10);
        });

        it('should transform eth_getBalance response', () => {
            const result = transformResponse('eth_getBalance', '0xde0b6b3a7640000');
            expect(result).toEqual({
                wei: '1000000000000000000',
                ether: '1'
            });
        });

        it('should transform eth_getBlockByNumber response', () => {
            const mockBlock = {
                number: '0xa',
                gasLimit: '0x1234',
                gasUsed: '0x1000',
                timestamp: '0x60ad0d60',
                transactions: []
            };
            const result = transformResponse('eth_getBlockByNumber', mockBlock);
            expect(result).toEqual({
                number: 10,
                gasLimit: 4660,
                gasUsed: 4096,
                timestamp: 1621953888,
                transactions: []
            });
        });

        it('should transform transaction values', () => {
            const mockTx = {
                blockNumber: '0xa',
                transactionIndex: '0x1',
                gas: '0x5208',
                gasPrice: '0x4a817c800',
                nonce: '0x0',
                value: '0xde0b6b3a7640000'
            };
            const result = transformResponse('eth_getTransactionByHash', mockTx);
            expect(result).toEqual({
                blockNumber: 10,
                transactionIndex: 1,
                gas: 21000,
                gasPrice: 20000000000,
                nonce: 0,
                value: {
                    wei: '1000000000000000000',
                    ether: '1'
                }
            });
        });

        it('should handle null values in transaction', () => {
            const mockTx = {
                blockNumber: null,
                transactionIndex: null,
                gas: '0x5208',
                gasPrice: null,
                nonce: '0x0',
                value: '0x0'
            };
            const result = transformResponse('eth_getTransactionByHash', mockTx);
            expect(result).toEqual({
                blockNumber: null,
                transactionIndex: null,
                gas: 21000,
                gasPrice: null,
                nonce: 0,
                value: {
                    wei: '0',
                    ether: '0'
                }
            });
        });

        it('should pass through non-numeric values unchanged', () => {
            const mockResult = {
                hash: '0x123',
                parentHash: '0x456'
            };
            const result = transformResponse('eth_getBlockByHash', mockResult);
            expect(result.hash).toBe('0x123');
            expect(result.parentHash).toBe('0x456');
        });
    });
});
