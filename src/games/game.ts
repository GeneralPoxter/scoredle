export const Game = {
    CATFISHING: 'Catfishing',
    KRILLION: 'Krillion',
} as const;

export type Game = (typeof Game)[keyof typeof Game];
