import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import {
  CreateGenreDto,
  UpdateGenreDto,
  AddUserGenrePreferenceDto,
  UpdateUserGenrePreferenceDto,
} from './dto';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class GenresService {
  constructor(private prisma: PrismaService) {}

  // ==================== GENRE CRUD (Admin) ====================

  /**
   * Get all genres (with optional filtering)
   */
  async findAll(includeInactive = false) {
    return this.prisma.genre.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get a genre by ID
   */
  async findById(id: string) {
    const genre = await this.prisma.genre.findUnique({
      where: { id },
    });

    if (!genre) {
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }

    return genre;
  }

  /**
   * Get a genre by slug
   */
  async findBySlug(slug: string) {
    const genre = await this.prisma.genre.findUnique({
      where: { slug },
    });

    if (!genre) {
      throw new NotFoundException(`Genre with slug "${slug}" not found`);
    }

    return genre;
  }

  /**
   * Create a new genre (admin only)
   */
  async create(data: CreateGenreDto) {
    // Check for duplicate name or slug
    const existing = await this.prisma.genre.findFirst({
      where: {
        OR: [{ name: data.name }, { slug: data.slug }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Genre with name "${data.name}" or slug "${data.slug}" already exists`,
      );
    }

    return this.prisma.genre.create({
      data: {
        name: data.name,
        slug: data.slug,
        color: data.color ?? '#C94BFF',
        iconUrl: data.iconUrl,
        description: data.description,
        order: data.order ?? 0,
      },
    });
  }

  /**
   * Update a genre (admin only)
   */
  async update(id: string, data: UpdateGenreDto) {
    const genre = await this.findById(id);

    // Check for duplicate name or slug if updating
    if (data.name || data.slug) {
      const existing = await this.prisma.genre.findFirst({
        where: {
          OR: [
            data.name ? { name: data.name } : { id: '' },
            data.slug ? { slug: data.slug } : { id: '' },
          ],
          NOT: { id: genre.id },
        },
      });

      if (existing) {
        throw new ConflictException(
          'Genre with this name or slug already exists',
        );
      }
    }

    return this.prisma.genre.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        color: data.color,
        iconUrl: data.iconUrl,
        description: data.description,
        isActive: data.isActive,
        order: data.order,
      },
    });
  }

  /**
   * Delete a genre (admin only)
   */
  async delete(id: string) {
    await this.findById(id);

    return this.prisma.genre.delete({
      where: { id },
    });
  }

  // ==================== USER GENRE PREFERENCES ====================

  /**
   * Get user's genre preferences
   */
  async getUserGenrePreferences(userId: string) {
    return this.prisma.userGenrePreference.findMany({
      where: { userId },
      include: {
        genre: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            iconUrl: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Add a genre to user's preferences
   */
  async addUserGenrePreference(userId: string, data: AddUserGenrePreferenceDto) {
    // Verify genre exists and is active
    const genre = await this.prisma.genre.findUnique({
      where: { id: data.genreId, isActive: true },
    });

    if (!genre) {
      throw new NotFoundException(
        `Genre with ID ${data.genreId} not found or inactive`,
      );
    }

    // Check if preference already exists
    const existing = await this.prisma.userGenrePreference.findUnique({
      where: {
        userId_genreId: {
          userId,
          genreId: data.genreId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Genre already in your preferences');
    }

    // Get the next order number
    const lastPreference = await this.prisma.userGenrePreference.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
    });

    const nextOrder = (lastPreference?.order ?? -1) + 1;

    return this.prisma.userGenrePreference.create({
      data: {
        userId,
        genreId: data.genreId,
        color: data.color,
        order: nextOrder,
      },
      include: {
        genre: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            iconUrl: true,
          },
        },
      },
    });
  }

  /**
   * Update a user genre preference
   */
  async updateUserGenrePreference(
    userId: string,
    preferenceId: string,
    data: UpdateUserGenrePreferenceDto,
  ) {
    const preference = await this.prisma.userGenrePreference.findFirst({
      where: { id: preferenceId, userId },
    });

    if (!preference) {
      throw new NotFoundException('Genre preference not found');
    }

    return this.prisma.userGenrePreference.update({
      where: { id: preferenceId },
      data: {
        color: data.color,
        order: data.order,
      },
      include: {
        genre: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            iconUrl: true,
          },
        },
      },
    });
  }

  /**
   * Remove a genre from user's preferences
   */
  async removeUserGenrePreference(userId: string, preferenceId: string) {
    const preference = await this.prisma.userGenrePreference.findFirst({
      where: { id: preferenceId, userId },
    });

    if (!preference) {
      throw new NotFoundException('Genre preference not found');
    }

    await this.prisma.userGenrePreference.delete({
      where: { id: preferenceId },
    });

    return { success: true };
  }

  /**
   * Reorder user's genre preferences
   */
  async reorderUserGenrePreferences(userId: string, preferenceIds: string[]) {
    // Verify all preferences belong to the user
    const preferences = await this.prisma.userGenrePreference.findMany({
      where: { userId, id: { in: preferenceIds } },
    });

    if (preferences.length !== preferenceIds.length) {
      throw new NotFoundException('Some genre preferences not found');
    }

    // Update order for each preference
    await Promise.all(
      preferenceIds.map((id, index) =>
        this.prisma.userGenrePreference.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.getUserGenrePreferences(userId);
  }
}
