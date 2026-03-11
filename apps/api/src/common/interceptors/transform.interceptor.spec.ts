import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response data', (done) => {
    const mockData = { id: 1, name: 'Test' };
    const mockExecutionContext = {
      switchToHttp: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };
    const mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('data', mockData);
        expect(result).toHaveProperty('timestamp');
        expect(typeof result.timestamp).toBe('string');
        done();
      },
    });
  });

  it('should handle null data', (done) => {
    const mockExecutionContext = {
      switchToHttp: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };
    const mockCallHandler = {
      handle: () => of(null),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('data', null);
        done();
      },
    });
  });

  it('should handle array data', (done) => {
    const mockData = [{ id: 1 }, { id: 2 }];
    const mockExecutionContext = {
      switchToHttp: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };
    const mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
        done();
      },
    });
  });
});
