import { PrismaService } from '../../config/prisma.service';
import { CreateGenreDto, UpdateGenreDto, AddUserGenrePreferenceDto, UpdateUserGenrePreferenceDto } from './dto';
export declare class GenresService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(includeInactive?: boolean): Promise<{
        name: string;
        description: string | null;
        slug: string;
        color: string;
        iconUrl: string | null;
        order: number;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findById(id: string): Promise<{
        name: string;
        description: string | null;
        slug: string;
        color: string;
        iconUrl: string | null;
        order: number;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findBySlug(slug: string): Promise<{
        name: string;
        description: string | null;
        slug: string;
        color: string;
        iconUrl: string | null;
        order: number;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(data: CreateGenreDto): Promise<{
        name: string;
        description: string | null;
        slug: string;
        color: string;
        iconUrl: string | null;
        order: number;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, data: UpdateGenreDto): Promise<{
        name: string;
        description: string | null;
        slug: string;
        color: string;
        iconUrl: string | null;
        order: number;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(id: string): Promise<{
        name: string;
        description: string | null;
        slug: string;
        color: string;
        iconUrl: string | null;
        order: number;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getUserGenrePreferences(userId: string): Promise<({
        genre: {
            name: string;
            slug: string;
            color: string;
            iconUrl: string | null;
            id: string;
        };
    } & {
        color: string | null;
        order: number;
        id: string;
        createdAt: Date;
        genreId: string;
        userId: string;
    })[]>;
    addUserGenrePreference(userId: string, data: AddUserGenrePreferenceDto): Promise<{
        genre: {
            name: string;
            slug: string;
            color: string;
            iconUrl: string | null;
            id: string;
        };
    } & {
        color: string | null;
        order: number;
        id: string;
        createdAt: Date;
        genreId: string;
        userId: string;
    }>;
    updateUserGenrePreference(userId: string, preferenceId: string, data: UpdateUserGenrePreferenceDto): Promise<{
        genre: {
            name: string;
            slug: string;
            color: string;
            iconUrl: string | null;
            id: string;
        };
    } & {
        color: string | null;
        order: number;
        id: string;
        createdAt: Date;
        genreId: string;
        userId: string;
    }>;
    removeUserGenrePreference(userId: string, preferenceId: string): Promise<{
        success: boolean;
    }>;
    reorderUserGenrePreferences(userId: string, preferenceIds: string[]): Promise<({
        genre: {
            name: string;
            slug: string;
            color: string;
            iconUrl: string | null;
            id: string;
        };
    } & {
        color: string | null;
        order: number;
        id: string;
        createdAt: Date;
        genreId: string;
        userId: string;
    })[]>;
}
//# sourceMappingURL=genres.service.d.ts.map