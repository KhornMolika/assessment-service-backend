import { Test, TestingModule } from '@nestjs/testing';
import { ClientAuthGuard } from './client-auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './public.decorator';

describe('ClientAuthGuard', () => {
  let guard: ClientAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ClientAuthGuard>(ClientAuthGuard);
    reflector = module.get(Reflector);

    // Mock super.canActivate to prevent actual Passport JWT strategy execution during unit tests
    jest
      .spyOn(Object.getPrototypeOf(ClientAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
  });

  const mockExecutionContext = (): ExecutionContext => {
    const req: any = {};
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('skips JWT check for @Public() routes', () => {
      const context = mockExecutionContext();
      reflector.getAllAndOverride.mockReturnValue(true);

      expect(guard.canActivate(context)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('delegates to super.canActivate if not @Public()', () => {
      const context = mockExecutionContext();
      reflector.getAllAndOverride.mockReturnValue(false);

      expect(guard.canActivate(context)).toBe(true); // Since we mocked super.canActivate to return true
    });
  });

  describe('handleRequest', () => {
    it('allows valid client and attaches it to request', () => {
      const context = mockExecutionContext();
      const client = { id: 'client-1' };

      const result = guard.handleRequest(null, client, null, context);

      expect(result).toEqual(client);
      expect(context.switchToHttp().getRequest().client).toEqual(client);
    });

    it('throws UnauthorizedException if client is missing', () => {
      const context = mockExecutionContext();

      expect(() => guard.handleRequest(null, null, null, context)).toThrow(
        UnauthorizedException,
      );
    });

    it('throws the provided err if present', () => {
      const context = mockExecutionContext();
      const customErr = new Error('Custom error');

      expect(() => guard.handleRequest(customErr, null, null, context)).toThrow(
        customErr,
      );
    });
  });
});
