export interface ParsedScore {
    puzzleId: string;
    score: number;
}

export type GameParser = (content: string) => ParsedScore[];
export type ScoreFormatter = (score: number) => string;

export interface GameDefinition<TId extends string = string> {
    id: TId;
    displayName: string;
    parseScores: GameParser;
    formatScore: ScoreFormatter;
    sortDirection: 1 | -1;
}

type GameDefinitionOptionalFields = 'formatScore' | 'sortDirection';

export function defineGame<const TId extends string>(
    definition: Omit<GameDefinition<TId>, GameDefinitionOptionalFields> &
        Partial<Pick<GameDefinition<TId>, GameDefinitionOptionalFields>>,
): GameDefinition<TId> {
    return {
        formatScore: String,
        sortDirection: 1,
        ...definition,
    };
}

export function normalizeText(content: string): string {
    return content.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r\n?/g, '\n');
}
