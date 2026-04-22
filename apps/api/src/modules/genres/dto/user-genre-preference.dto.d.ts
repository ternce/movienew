export declare class AddUserGenrePreferenceDto {
    genreId: string;
    color?: string;
}
export declare class UpdateUserGenrePreferenceDto {
    color?: string;
    order?: number;
}
export declare class ReorderUserGenrePreferencesDto {
    preferenceIds: string[];
}
export declare class UserGenrePreferenceResponseDto {
    id: string;
    userId: string;
    genreId: string;
    color?: string;
    order: number;
    createdAt: Date;
    genre: {
        id: string;
        name: string;
        slug: string;
        color: string;
        iconUrl?: string;
    };
}
//# sourceMappingURL=user-genre-preference.dto.d.ts.map