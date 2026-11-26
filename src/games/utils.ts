export interface ParsedScore {
    puzzleId: string;
    score: number;
}

export type GameParser = (content: string) => ParsedScore | null;

export interface GameDefinition<TId extends string = string> {
    id: TId;
    displayName: string;
    parseScore: GameParser;
}

export function defineGame<const TId extends string>(
    definition: GameDefinition<TId>,
): GameDefinition<TId> {
    return definition;
}
