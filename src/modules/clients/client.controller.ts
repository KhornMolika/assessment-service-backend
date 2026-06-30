import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiSecurity,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import {
  ClientCreatedResponseDto,
  ClientResponseDto,
} from './dto/client-response.dto';
import { SuperAdmin } from '../auth/guards/super-admin.decorator';
import { CurrentClient } from '../../common/decorators/current-client.decorator';
import { Client } from './client.entity';

@ApiTags('Clients')
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // ── Super Admin endpoints ──────────────────────────────────────

  @Post()
  @SuperAdmin()
  @ApiSecurity('x-admin-api-key')
  @ApiOperation({ summary: '[Admin] Provision new client — secret shown once' })
  @ApiResponse({
    status: 201,
    description: 'Client successfully provisioned.',
    type: ClientCreatedResponseDto,
  })
  async create(
    @Body() dto: CreateClientDto,
  ): Promise<ClientCreatedResponseDto> {
    const { client, rawSecret } = await this.clientService.create(dto);
    return plainToInstance(
      ClientCreatedResponseDto,
      { ...client, clientSecret: rawSecret },
      { excludeExtraneousValues: true },
    );
  }

  @Get()
  @SuperAdmin()
  @ApiSecurity('x-admin-api-key')
  @ApiOperation({ summary: '[Admin] List all clients' })
  @ApiResponse({
    status: 200,
    description: 'List of all clients.',
    type: [ClientResponseDto],
  })
  async findAll(): Promise<ClientResponseDto[]> {
    const clients = await this.clientService.findAll();
    return plainToInstance(ClientResponseDto, clients, {
      excludeExtraneousValues: true,
    });
  }

  // ── Tenant self-service endpoints (/me) ───────────────────────

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own client profile' })
  @ApiResponse({
    status: 200,
    description: 'Client profile retrieved successfully.',
    type: ClientResponseDto,
  })
  // eslint-disable-next-line @typescript-eslint/require-await
  async getMe(@CurrentClient() client: Client): Promise<ClientResponseDto> {
    return plainToInstance(ClientResponseDto, client, {
      excludeExtraneousValues: true,
    });
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own client configuration' })
  @ApiResponse({
    status: 200,
    description: 'Client configuration updated successfully.',
    type: ClientResponseDto,
  })
  async updateMe(
    @CurrentClient() client: Client,
    @Body() dto: UpdateMeDto,
  ): Promise<ClientResponseDto> {
    const updated = await this.clientService.update(client.id, dto);
    return plainToInstance(ClientResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  // ── Admin :id endpoints ─────────────────────────────────────────

  @Get(':id')
  @SuperAdmin()
  @ApiSecurity('x-admin-api-key')
  @ApiOperation({ summary: '[Admin] Get client by ID' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({
    status: 200,
    description: 'Client retrieved successfully.',
    type: ClientResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    const client = await this.clientService.findOne(id);
    return plainToInstance(ClientResponseDto, client, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @SuperAdmin()
  @ApiSecurity('x-admin-api-key')
  @ApiOperation({ summary: '[Admin] Update any client' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({
    status: 200,
    description: 'Client updated successfully.',
    type: ClientResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    const client = await this.clientService.update(id, dto);
    return plainToInstance(ClientResponseDto, client, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/rotate-secret')
  @SuperAdmin()
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('x-admin-api-key')
  @ApiOperation({ summary: '[Admin] Rotate client secret' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({
    status: 200,
    description: 'Client secret rotated successfully.',
    type: ClientCreatedResponseDto,
  })
  async rotateSecret(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientCreatedResponseDto> {
    const { client, rawSecret } = await this.clientService.rotateSecret(id);
    return plainToInstance(
      ClientCreatedResponseDto,
      { ...client, clientSecret: rawSecret },
      { excludeExtraneousValues: true },
    );
  }

  @Patch(':id/suspend')
  @SuperAdmin()
  @ApiSecurity('x-admin-api-key')
  @ApiOperation({ summary: '[Admin] Suspend a client' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({
    status: 200,
    description: 'Client suspended successfully.',
    type: ClientResponseDto,
  })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    const client = await this.clientService.setActive(id, false);
    return plainToInstance(ClientResponseDto, client, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/activate')
  @SuperAdmin()
  @ApiSecurity('x-admin-api-key')
  @ApiOperation({ summary: '[Admin] Activate a client' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({
    status: 200,
    description: 'Client activated successfully.',
    type: ClientResponseDto,
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    const client = await this.clientService.setActive(id, true);
    return plainToInstance(ClientResponseDto, client, {
      excludeExtraneousValues: true,
    });
  }
}
