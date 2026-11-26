import { catfishingGame } from './catfishing';
import { krillionGame } from './krillion';

// Register new games here
export const GAMES = [catfishingGame, krillionGame] as const;

type Game = (typeof GAMES)[number];
export type GameId = Game['id'];

export const GAME_IDS = GAMES.map((g) => g.id);

const GAME_MAP = Object.fromEntries(GAMES.map((g) => [g.id, g])) as {
    [Id in GameId]: Extract<Game, { id: Id }>;
};

export function getGame<TId extends GameId>(id: TId) {
    return GAME_MAP[id];
}

export function isGame(value: string | undefined): value is GameId {
    return value !== undefined && value in GAME_MAP;
}
