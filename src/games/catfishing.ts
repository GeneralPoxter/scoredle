import { defineGame } from './utils';

export const catfishingGame = defineGame({
    id: 'catfishing',
    displayName: 'Catfishing',
    parseScore: (content) => {
        const match = content.match(/#(\d+)\s*-\s*(\d+)\s*\/\s*\d+/);
        if (!match) return null;

        return {
            puzzleId: match[1],
            score: Number(match[2]),
        };
    },
});
