import { GenresService } from './genres.service';
import { CreateGenreDto, UpdateGenreDto, AddUserGenrePreferenceDto, UpdateUserGenrePreferenceDto, ReorderUserGenrePreferencesDto } from './dto';
export declare class GenresController {
    private readonly genresService;
    constructor(genresService: GenresService);
    findAll(): Promise<{
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
    findAllAdmin(includeInactive?: boolean): Promise<{
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
    create(createGenreDto: CreateGenreDto): Promise<{
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
    update(id: string, updateGenreDto: UpdateGenreDto): Promise<{
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
    delete(id: string): Promise<void>;
}
export declare class UserGenrePreferencesController {
    private readonly genresService;
    constructor(genresService: GenresService);
    getUserGenres(userId: string): Promise<({
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
    addGenre(userId: string, addDto: AddUserGenrePreferenceDto): Promise<{
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
    updatePreference(userId: string, preferenceId: string, updateDto: UpdateUserGenrePreferenceDto): Promise<{
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
    removeGenre(userId: string, preferenceId: string): Promise<void>;
    reorderPreferences(userId: string, reorderDto: ReorderUserGenrePreferencesDto): Promise<({
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
//# sourceMappingURL=genres.controller.d.ts.map