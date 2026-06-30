import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminGuard } from './super-admin.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('super-secret-admin-key'),
          },
        },
      ],
    }).compile();

    guard = module.get<SuperAdminGuard>(SuperAdminGuard);
    configService = module.get(ConfigService);
  });

  const mockExecutionContext = (
    headers: Record<string, string>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows request with correct x-admin-api-key', () => {
    const context = mockExecutionContext({
      'x-admin-api-key': 'super-secret-admin-key',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException for wrong key', () => {
    const context = mockExecutionContext({
      'x-admin-api-key': 'wrong-key',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for missing header', () => {
    const context = mockExecutionContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('handles empty key correctly', () => {
    const context = mockExecutionContext({
      'x-admin-api-key': '',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('handles longer key than expected safely', () => {
    const context = mockExecutionContext({
      'x-admin-api-key': 'super-secret-admin-key-extra',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
