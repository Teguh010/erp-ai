import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  const createMockExecutionContext = (method = 'GET', url = '/test') => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        method,
        url,
        body: {},
        get: jest.fn().mockReturnValue('test-user-agent'),
      }),
      getResponse: jest.fn().mockReturnValue({
        statusCode: 200,
        get: jest.fn().mockReturnValue('100'),
      }),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  });

  it('should log successful requests', (done) => {
    const mockContext = createMockExecutionContext();
    const mockCallHandler = {
      handle: () => of({ data: 'test' }),
    };

    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: () => {
        expect(logSpy).toHaveBeenCalled();
        done();
      },
    });
  });

  it('should log error requests', (done) => {
    const mockContext = createMockExecutionContext('POST', '/api/test');
    const mockCallHandler = {
      handle: () => throwError(() => new Error('Test error')),
    };

    const errorSpy = jest.spyOn(interceptor['logger'], 'error');

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalled();
        done();
      },
    });
  });

  it('should pass through response data unchanged', (done) => {
    const mockContext = createMockExecutionContext();
    const responseData = { id: 1, name: 'Test' };
    const mockCallHandler = {
      handle: () => of(responseData),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual(responseData);
        done();
      },
    });
  });

  it('should handle missing user-agent', (done) => {
    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          url: '/test',
          body: {},
          get: jest.fn().mockReturnValue(''),
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode: 200,
          get: jest.fn().mockReturnValue(null),
        }),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };
    const mockCallHandler = {
      handle: () => of({}),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: () => {
        done();
      },
    });
  });
});
