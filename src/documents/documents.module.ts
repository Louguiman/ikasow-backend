import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { Property } from '../properties/entities/property.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Client } from '../clients/entities/client.entity';
import { Invoice } from '../invoices/entities/invoice.entity';

/**
 * The four relation repositories are registered because `DocumentsService` checks
 * each linked id against the caller's agency before writing. A repository missing
 * from `forFeature` compiles and passes the unit tests (the token is mocked there)
 * and then fails at boot with `Nest can't resolve dependencies of DocumentsService`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Property, Tenant, Client, Invoice]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
