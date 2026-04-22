export declare class CreateGenreDto {
    name: string;
    slug: string;
    color?: string;
    iconUrl?: string;
    description?: string;
    order?: number;
}
export declare class UpdateGenreDto {
    name?: string;
    slug?: string;
    color?: string;
    iconUrl?: string;
    description?: string;
    isActive?: boolean;
    order?: number;
}
export declare class GenreResponseDto {
    id: string;
    name: string;
    slug: string;
    color: string;
    iconUrl?: string;
    description?: string;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=genre.dto.d.ts.map