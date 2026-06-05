import { AuthThrottlerGuard } from './auth-throttler.guard';
import { ThrottlerOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

describe('AuthThrottlerGuard', () => {
  let guard: AuthThrottlerGuard;

  beforeEach(() => {
    // We mock the constructor arguments required by ThrottlerGuard
    const mockOptions: ThrottlerOptions = {} as any;
    const mockStorage: ThrottlerStorage = {} as any;
    const mockReflector: Reflector = {} as any;

    guard = new AuthThrottlerGuard(mockOptions, mockStorage, mockReflector);
    
    // Mock the super.handleRequest method to avoid executing actual throttler logic
    jest.spyOn(Object.getPrototypeOf(AuthThrottlerGuard.prototype), 'handleRequest').mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('returns true and skips super if throttler name is not auth or authBurst', async () => {
      const requestProps: any = {
        throttler: { name: 'default' },
      };

      const result = await (guard as any).handleRequest(requestProps);

      expect(result).toBe(true);
      expect(Object.getPrototypeOf(AuthThrottlerGuard.prototype).handleRequest).not.toHaveBeenCalled();
    });

    it('calls super.handleRequest if throttler name is auth', async () => {
      const requestProps: any = {
        throttler: { name: 'auth' },
      };

      const result = await (guard as any).handleRequest(requestProps);

      expect(result).toBe(true); // From our mock
      expect(Object.getPrototypeOf(AuthThrottlerGuard.prototype).handleRequest).toHaveBeenCalledWith(requestProps);
    });

    it('calls super.handleRequest if throttler name is authBurst', async () => {
      const requestProps: any = {
        throttler: { name: 'authBurst' },
      };

      const result = await (guard as any).handleRequest(requestProps);

      expect(result).toBe(true); // From our mock
      expect(Object.getPrototypeOf(AuthThrottlerGuard.prototype).handleRequest).toHaveBeenCalledWith(requestProps);
    });
  });

  describe('getTracker', () => {
    it('returns clientId from body if present and is a string', async () => {
      const req: any = {
        body: { clientId: 'client-123' },
        ip: '127.0.0.1',
      };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker).toBe('clientId:client-123');
    });

    it('falls back to IP if clientId is missing', async () => {
      const req: any = {
        body: {},
        ip: '127.0.0.1',
      };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker).toBe('127.0.0.1');
    });

    it('falls back to IP if clientId is not a string', async () => {
      const req: any = {
        body: { clientId: 12345 },
        ip: '127.0.0.1',
      };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker).toBe('127.0.0.1');
    });

    it('falls back to "unknown" if both clientId and IP are missing', async () => {
      const req: any = {
        body: {},
      };

      const tracker = await (guard as any).getTracker(req);

      expect(tracker).toBe('unknown');
    });
  });
});
