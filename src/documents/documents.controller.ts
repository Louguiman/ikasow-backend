import {
  Body,
  Controller,
  Delete,
  NotFoundException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { Document } from './entities/document.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { documentUploadConfig } from '../config/multer.config';
import { existsSync } from 'fs';
import type { Response } from 'express';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @UseInterceptors(FileInterceptor('file', documentUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a document',
    description:
      'multipart/form-data with a `file` part and the metadata as fields. ' +
      'PDF, JPEG, PNG or WebP up to 10MB. The stored filename, size and mime ' +
      'type are read from the upload, not the body.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        documentType: {
          type: 'string',
          enum: [
            'lease-contract',
            'inventory',
            'invoice',
            'rent-receipt',
            'id-document',
            'insurance-certificate',
            'other',
          ],
        },
        propertyId: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        clientId: { type: 'string', format: 'uuid' },
        invoiceId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'The created document' })
  @ApiResponse({
    status: 404,
    description:
      'A linked property/tenant/client/invoice is not in this agency',
  })
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Document> {
    return this.documentsService.create(createDocumentDto, agencyId, file);
  }

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.AGENT,
  )
  @ApiOperation({ summary: "List this agency's documents" })
  @ApiResponse({ status: 200, description: 'Paginated documents' })
  findAll(
    @Query() filters: FilterDocumentDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<PaginatedResponse<Document>> {
    return this.documentsService.findAll(agencyId, filters);
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.AGENT,
  )
  @ApiOperation({ summary: "Get one of this agency's documents" })
  @ApiResponse({ status: 200, description: 'The document' })
  @ApiResponse({ status: 404, description: "Not found, or another agency's" })
  findOne(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Document> {
    return this.documentsService.findOne(id, agencyId);
  }

  /**
   * The bytes.
   *
   * Not `/files/:filename`. That route is `@Public()`, so the global
   * `JwtAuthGuard` never runs on it and `request.user` is undefined no matter what
   * token the caller sent — a document could not be served there at all. This
   * route goes through the normal chain, so `req.user` is real, and the service's
   * `findOne` scopes on the caller's agency before the file is touched.
   *
   * `Content-Disposition` is an attachment because `originalName` is the name the
   * user uploaded, not the timestamped name on disk.
   */
  @Get(':id/file')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.AGENT,
  )
  @ApiOperation({
    summary: "Download one of this agency's documents",
    description:
      'Returns the bytes as an attachment. Authenticated by the normal guard ' +
      'chain, unlike `/files/:filename`, which is a public route and serves ' +
      'property images only.',
  })
  @ApiResponse({ status: 200, description: 'The file' })
  @ApiResponse({ status: 404, description: "Not found, or another agency's" })
  async download(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
    @Res() res: Response,
  ): Promise<void> {
    const document = await this.documentsService.findOne(id, agencyId);
    const filePath = this.documentsService.getFilePath(document);

    if (!existsSync(filePath)) {
      // The row is there and the bytes are not. Not a 404 on the document: the
      // document exists, and saying otherwise would be wrong in the other
      // direction.
      throw new NotFoundException('The file for this document is missing');
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.originalName)}"`,
    );
    res.setHeader('Content-Type', document.mimeType);
    res.sendFile(filePath);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: "Edit a document's metadata",
    description:
      'Metadata only. The bytes are not replaceable through a PATCH — a new ' +
      'file is a new upload, because swapping one would orphan the object the ' +
      'stored filename points at.',
  })
  @ApiResponse({ status: 200, description: 'The updated document' })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Document> {
    return this.documentsService.update(id, agencyId, updateDocumentDto);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a document and its file',
    description: 'The row and the bytes go together; an orphan is unlistable.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<void> {
    return this.documentsService.remove(id, agencyId);
  }
}
