import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FileAccessGuard } from '../guards/file-access.guard';
import { Public } from '../../auth/decorators/public.decorator';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('files')
@Controller('files')
export class FilesController {
  @Get(':filename')
  @Public()
  @UseGuards(FileAccessGuard)
  @ApiOperation({ 
    summary: 'Serve a file with authorization check',
    description: 'Serves uploaded property images with proper authorization. Public users can only access images of published properties. Documents are **not** served here — this route is `@Public()`, so no user is ever resolved on it; they are served by `GET /documents/:id/file`, which is authenticated.',
  })
  @ApiParam({
    name: 'filename',
    description: 'The filename to retrieve',
    example: '1234567890-abcdef1234567890.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File served successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async serveFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const filePath = path.join(process.cwd(), 'uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Serve the file
    res.sendFile(filePath);
  }
}
