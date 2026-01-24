import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { multerConfig } from '../config/multer.config';
import { FileTypeValidationPipe, SanitizationPipe } from '../common/pipes';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';

@ApiTags('properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Create a new property' })
  @ApiResponse({
    status: 201,
    description: 'Property successfully created',
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
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    // Set agencyId from effective agency ID
    createPropertyDto.agencyId = agencyId;
    return this.propertiesService.create(createPropertyDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all properties with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of properties',
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
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('city', new SanitizationPipe()) city?: string,
    @Query('type', new SanitizationPipe()) type?: string,
    @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query('status', new SanitizationPipe()) status?: string,
  ) {
    const filters = {
      city,
      type,
      minPrice,
      maxPrice,
      status: status as any, // Cast to PropertyStatus in service
    };

    return this.propertiesService.findAll(agencyId, page, limit, filters);
  }

  @Get('public')
  @Public()
  @ApiOperation({
    summary: 'Get public property listings (no authentication required)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns published properties with images',
  })
  findPublicProperties(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.propertiesService.findPublicProperties(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get a property by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the property details',
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
    description: 'Property not found',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.propertiesService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Update a property' })
  @ApiResponse({
    status: 200,
    description: 'Property successfully updated',
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
    description: 'Property not found',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.propertiesService.update(id, updatePropertyDto, agencyId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Delete a property' })
  @ApiResponse({
    status: 200,
    description: 'Property successfully deleted',
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
    description: 'Property not found',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.propertiesService.remove(id, agencyId);
  }

  @Post(':id/images')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiOperation({ summary: 'Upload property image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, or WebP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or file size exceeds limit',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(new FileTypeValidationPipe()) file: Express.Multer.File,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.propertiesService.uploadImage(id, file, agencyId);
  }

  @Get(':id/images')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all images for a property' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of property images',
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
    description: 'Property not found',
  })
  getImages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.propertiesService.getImages(id, agencyId);
  }

  @Delete(':id/images/:imageId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Delete a property image' })
  @ApiResponse({
    status: 200,
    description: 'Image successfully deleted',
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
    description: 'Property or image not found',
  })
  deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.propertiesService.deleteImage(id, imageId, agencyId);
  }

  @Patch(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Publish a property' })
  @ApiResponse({
    status: 200,
    description: 'Property published successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.propertiesService.publish(id, agencyId);
  }

  @Patch(':id/unpublish')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Unpublish a property' })
  @ApiResponse({
    status: 200,
    description: 'Property unpublished successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.propertiesService.unpublish(id, agencyId);
  }
}

