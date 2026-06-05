import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ClientService } from '../clients/client.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { TokenRequestDto } from './dto/token-request.dto';

describe('AuthService', () => {
  let service: AuthService;
  let clientService: jest.Mocked<ClientService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ClientService,
          useValue: {
            verifySecret: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    clientService = module.get(ClientService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    
    // Silence the logger to prevent expected errors from cluttering test output
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('token', () => {
    const validDto: TokenRequestDto = {
      grant_type: 'client_credentials',
      clientId: 'valid_client',
      clientSecret: 'valid_secret',
    };

    it('returns token for valid credentials', async () => {
      clientService.verifySecret.mockResolvedValue({
        clientId: 'valid_client',
        slug: 'valid-slug',
        scopes: ['read', 'write'],
      } as any);

      configService.get.mockReturnValue(3600);
      jwtService.signAsync.mockResolvedValue('signed_jwt_token');

      const result = await service.token(validDto);

      expect(result).toEqual({
        access_token: 'signed_jwt_token',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(clientService.verifySecret).toHaveBeenCalledWith('valid_client', 'valid_secret');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 'valid_client',
          slug: 'valid-slug',
          scopes: ['read', 'write'],
        },
        { expiresIn: 3600 },
      );
    });

    it('throws BadRequestException for wrong grant_type', async () => {
      const invalidDto: TokenRequestDto = {
        ...validDto,
        grant_type: 'password' as any,
      };

      await expect(service.token(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException for wrong secret or inactive client', async () => {
      clientService.verifySecret.mockResolvedValue(null);

      await expect(service.token(validDto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws InternalServerErrorException for unexpected errors', async () => {
      clientService.verifySecret.mockRejectedValue(new Error('DB Error'));

      await expect(service.token(validDto)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
