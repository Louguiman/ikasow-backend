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
import { InvoicesService } from './invoices.service';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({
    status: 201,
    description: 'Invoice successfully created',
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
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.invoicesService.create(createInvoiceDto, agencyId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.AGENT)
  @ApiOperation({ summary: 'Get all invoices with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of invoices',
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
    @Query() filter: FilterInvoiceDto,
  ) {
    return this.invoicesService.findAll(agencyId, filter);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.AGENT,
    UserRole.TENANT,
    UserRole.CLIENT,
  )
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the invoice details',
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
    description: 'Invoice not found',
  })
  findOne(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
    @Req() req: Request,
  ) {
    return this.invoicesService.findOne(id, agencyId, {
      userId: (req.user as any).sub,
      role: (req.user as any).role,
    });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiResponse({
    status: 200,
    description: 'Invoice successfully updated',
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
    description: 'Invoice not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.invoicesService.update(id, agencyId, updateInvoiceDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiResponse({
    status: 200,
    description: 'Invoice successfully deleted',
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
    description: 'Invoice not found',
  })
  remove(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.invoicesService.remove(id, agencyId);
  }

  @Patch(':id/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  @ApiResponse({
    status: 200,
    description: 'Invoice successfully marked as paid',
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
    description: 'Invoice not found',
  })
  markAsPaid(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.invoicesService.markAsPaid(id, agencyId);
  }
}
