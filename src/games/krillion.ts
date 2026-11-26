import { defineGame } from './utils';

export const krillionGame = defineGame({
    id: 'krillion',
    displayName: 'Krillion',
    parseScore: (content) => {
        const idMatch = content.match(/Krillion\s+#(\d+)/i);
        const scoreMatch = content.match(/^\s*(\d+)\s*$/m);
        if (!idMatch || !scoreMatch) return null;

        return {
            puzzleId: idMatch[1],
            score: Number(scoreMatch[1]),
        };
    },
});
