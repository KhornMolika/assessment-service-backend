import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Public } from '../auth/guards/public.decorator';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientCreatedResponseDto, ClientResponseDto } from './dto/client-response.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
// Add a super-admin scope guard here once super admin is implemented:
// @UseGuards(ScopeGuard)  @RequireScope('clients:manage')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Public() // Temporarily public to allow initial client creation
  @Post()
  @ApiOperation({ summary: 'Provision new client — secret shown once' })
  async create(@Body() dto: CreateClientDto): Promise<ClientCreatedResponseDto> {
    const { client, rawSecret } = await this.clientService.create(dto);
    return {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      slug: client.slug,
      isActive: client.isActive,
      scopes: client.scopes,
      allowedOrigins: client.allowedOrigins,
      webhookUrl: client.webhookUrl,
      createdAt: client.createdAt,
      clientSecret: rawSecret,
    } as any;
  }

  @Get()
  async findAll(): Promise<ClientResponseDto[]> {
    const clients = await this.clientService.findAll();
    return plainToInstance(ClientResponseDto, clients, { excludeExtraneousValues: true });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    const client = await this.clientService.findOne(id);
    return plainToInstance(ClientResponseDto, client, { excludeExtraneousValues: true });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    const client = await this.clientService.update(id, dto);
    return plainToInstance(ClientResponseDto, client, { excludeExtraneousValues: true });
  }

  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate secret — new secret shown once, old immediately invalid' })
  async rotateSecret(@Param('id', ParseUUIDPipe) id: string): Promise<ClientCreatedResponseDto> {
    const { client, rawSecret } = await this.clientService.rotateSecret(id);
    return {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      slug: client.slug,
      isActive: client.isActive,
      scopes: client.scopes,
      allowedOrigins: client.allowedOrigins,
      webhookUrl: client.webhookUrl,
      createdAt: client.createdAt,
      clientSecret: rawSecret,
    } as any;
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend client — blocks all token issuance immediately' })
  async suspend(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    const client = await this.clientService.setActive(id, false);
    return plainToInstance(ClientResponseDto, client, { excludeExtraneousValues: true });
  }

  @Patch(':id/activate')
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    const client = await this.clientService.setActive(id, true);
    return plainToInstance(ClientResponseDto, client, { excludeExtraneousValues: true });
  }
}
