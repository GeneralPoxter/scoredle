import { defineGame, normalizeText, type ParsedScore } from './utils';

export const krillionGame = defineGame({
    id: 'krillion',
    displayName: 'Krillion',
    parseScores: (content) => {
        if (!content.trim()) return [];

        const text = normalizeText(content);
        const headerRegex = /\bkrillion\b[^\n#]*#(\d+)/gi;
        const headers = [...text.matchAll(headerRegex)];

        if (headers.length === 0) return [];

        const results: ParsedScore[] = [];

        for (let i = 0; i < headers.length; i++) {
            const current = headers[i];
            const next = headers[i + 1];

            const puzzleId = current[1];
            const blockStart = (current.index ?? 0) + current[0].length;
            const blockEnd = next?.index ?? text.length;
            const block = text.slice(blockStart, blockEnd);

            const scoreMatch = block.match(/^[ \t]*(\d+)[ \t]*$/m);
            if (!scoreMatch) continue;

            const score = Number(scoreMatch[1]);
            if (Number.isNaN(score)) continue;

            results.push({ puzzleId, score });
        }

        return results;
    },
});
