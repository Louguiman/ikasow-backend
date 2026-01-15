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
  ParseEnumPipe,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { RoleHierarchy } from '../common/utils/role-hierarchy';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
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
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: any,
    @CurrentAgencyId() effectiveAgencyId: string,
  ) {
    // 1. Security Check: Role Hierarchy
    // Ensure the requester has permission to create a user with the requested role
    if (!RoleHierarchy.canManageRole(req.user.role, createUserDto.role)) {
      throw new ForbiddenException(
        `Your role (${req.user.role}) is not authorized to create a user with role ${createUserDto.role}`,
      );
    }

    // 2. Set Agency ID
    // Platform admin can create users for any agency (must provide agencyId in DTO)
    // Others are restricted to their own agency
    if (req.user.role !== UserRole.PLATFORM_ADMIN) {
      createUserDto.agencyId = effectiveAgencyId;
    }

    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of users',
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
    @Query('role', new ParseEnumPipe(UserRole, { optional: true }))
    role?: UserRole,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.usersService.findAll(agencyId, role, page, limit);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current user profile',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.sub);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user details',
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
    description: 'User not found',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.usersService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
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
    description: 'User not found',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentAgencyId() agencyId: string,
    @Request() req: any,
  ) {
    // Security Check: If updating role, check hierarchy
    if (updateUserDto.role && !RoleHierarchy.canManageRole(req.user.role, updateUserDto.role)) {
      throw new ForbiddenException(
        `Your role (${req.user.role}) is not authorized to update a user to role ${updateUserDto.role}`,
      );
    }

    return this.usersService.update(id, updateUserDto, agencyId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
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
    description: 'User not found',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.usersService.remove(id, agencyId);
  }
}

