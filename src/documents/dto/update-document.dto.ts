import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';

/**
 * Metadata only. The bytes are not replaceable through a `PATCH`: swapping a file
 * would orphan the object on disk that `filename` points at, so a replacement is
 * an upload of a new document (or an explicit re-upload endpoint) rather than a
 * field edit.
 */
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
