import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { FilterClientDto } from './dto/filter-client.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({
    status: 201,
    description: 'Client successfully created',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  create(
    @Body() createClientDto: CreateClientDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    // Override agencyId with the effective agency ID
    createClientDto.agencyId = agencyId;
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Get all clients with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of clients',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  findAll(
    @CurrentAgencyId() agencyId: string,
    @Query() filter: FilterClientDto,
  ) {
    return this.clientsService.findAll(agencyId, filter);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CLIENT)
  @ApiOperation({ summary: 'Get a client by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the client details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or cross-agency access',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  findOne(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
    @Req() req: Request,
  ) {
    return this.clientsService.findOne(id, agencyId, {
      userId: (req.user as any).sub,
      role: (req.user as any).role,
    });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Update a client' })
  @ApiResponse({
    status: 200,
    description: 'Client successfully updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or cross-agency access',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.clientsService.update(id, agencyId, updateClientDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a client' })
  @ApiResponse({
    status: 200,
    description: 'Client successfully deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or cross-agency access',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  remove(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.clientsService.remove(id, agencyId);
  }
}
