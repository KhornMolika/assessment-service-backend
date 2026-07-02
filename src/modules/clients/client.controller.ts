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

@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // ── Super Admin endpoints ──────────────────────────────────────

  @Post()
  @SuperAdmin()
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
  async findAll(): Promise<ClientResponseDto[]> {
    const clients = await this.clientService.findAll();
    return plainToInstance(ClientResponseDto, clients, {
      excludeExtraneousValues: true,
    });
  }

  // ── Tenant self-service endpoints (/me) ───────────────────────

  @Get('me')
  // eslint-disable-next-line @typescript-eslint/require-await
  async getMe(@CurrentClient() client: Client): Promise<ClientResponseDto> {
    return plainToInstance(ClientResponseDto, client, {
      excludeExtraneousValues: true,
    });
  }

  @Patch('me')
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
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClientResponseDto> {
    const client = await this.clientService.setActive(id, true);
    return plainToInstance(ClientResponseDto, client, {
      excludeExtraneousValues: true,
    });
  }
}
