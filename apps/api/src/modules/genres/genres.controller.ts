import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import {
  CreateGenreDto,
  UpdateGenreDto,
  GenreResponseDto,
  AddUserGenrePreferenceDto,
  UpdateUserGenrePreferenceDto,
  ReorderUserGenrePreferencesDto,
  UserGenrePreferenceResponseDto,
} from './dto';
import { GenresService } from './genres.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('genres')
@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  // ==================== PUBLIC GENRE ENDPOINTS ====================

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active genres' })
  @ApiResponse({
    status: 200,
    description: 'List of all active genres',
    type: [GenreResponseDto],
  })
  async findAll() {
    return this.genresService.findAll(false);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a genre by ID' })
  @ApiResponse({
    status: 200,
    description: 'Genre details',
    type: GenreResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  async findById(@Param('id') id: string) {
    return this.genresService.findById(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a genre by slug' })
  @ApiResponse({
    status: 200,
    description: 'Genre details',
    type: GenreResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.genresService.findBySlug(slug);
  }

  // ==================== ADMIN GENRE ENDPOINTS ====================

  @Get('admin/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all genres including inactive (admin only)' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive genres',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all genres',
    type: [GenreResponseDto],
  })
  async findAllAdmin(@Query('includeInactive') includeInactive?: boolean) {
    return this.genresService.findAll(includeInactive ?? true);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new genre (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Genre created successfully',
    type: GenreResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Genre with this name/slug exists' })
  async create(@Body() createGenreDto: CreateGenreDto) {
    return this.genresService.create(createGenreDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a genre (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Genre updated successfully',
    type: GenreResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  @ApiResponse({ status: 409, description: 'Duplicate name/slug' })
  async update(
    @Param('id') id: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ) {
    return this.genresService.update(id, updateGenreDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a genre (admin only)' })
  @ApiResponse({ status: 204, description: 'Genre deleted successfully' })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  async delete(@Param('id') id: string) {
    await this.genresService.delete(id);
  }
}

// ==================== USER GENRE PREFERENCES CONTROLLER ====================

@ApiTags('user-genres')
@ApiBearerAuth()
@Controller('users/me/genres')
export class UserGenrePreferencesController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @ApiOperation({ summary: "Get current user's genre preferences" })
  @ApiResponse({
    status: 200,
    description: 'List of user genre preferences',
    type: [UserGenrePreferenceResponseDto],
  })
  async getUserGenres(@CurrentUser('id') userId: string) {
    return this.genresService.getUserGenrePreferences(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a genre to preferences' })
  @ApiResponse({
    status: 201,
    description: 'Genre added to preferences',
    type: UserGenrePreferenceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  @ApiResponse({ status: 409, description: 'Genre already in preferences' })
  async addGenre(
    @CurrentUser('id') userId: string,
    @Body() addDto: AddUserGenrePreferenceDto,
  ) {
    return this.genresService.addUserGenrePreference(userId, addDto);
  }

  @Patch(':preferenceId')
  @ApiOperation({ summary: 'Update a genre preference' })
  @ApiResponse({
    status: 200,
    description: 'Preference updated successfully',
    type: UserGenrePreferenceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Preference not found' })
  async updatePreference(
    @CurrentUser('id') userId: string,
    @Param('preferenceId') preferenceId: string,
    @Body() updateDto: UpdateUserGenrePreferenceDto,
  ) {
    return this.genresService.updateUserGenrePreference(
      userId,
      preferenceId,
      updateDto,
    );
  }

  @Delete(':preferenceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a genre from preferences' })
  @ApiResponse({ status: 204, description: 'Preference removed successfully' })
  @ApiResponse({ status: 404, description: 'Preference not found' })
  async removeGenre(
    @CurrentUser('id') userId: string,
    @Param('preferenceId') preferenceId: string,
  ) {
    await this.genresService.removeUserGenrePreference(userId, preferenceId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder genre preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences reordered successfully',
    type: [UserGenrePreferenceResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Some preferences not found' })
  async reorderPreferences(
    @CurrentUser('id') userId: string,
    @Body() reorderDto: ReorderUserGenrePreferencesDto,
  ) {
    return this.genresService.reorderUserGenrePreferences(
      userId,
      reorderDto.preferenceIds,
    );
  }
}
