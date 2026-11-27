import { defineGame, normalizeText, type ParsedScore } from './utils';

export const catfishingGame = defineGame({
    id: 'catfishing',
    displayName: 'Catfishing',
    parseScores: (content) => {
        if (typeof content !== 'string' || !content.trim()) return [];

        const text = normalizeText(content);
        const hasCatfishingMarker = /\bcatfishing(?:\.net)?\b/i.test(text);

        // Match "#XYZ - N/10" while preventing a score from crossing into
        // another "#ABC" puzzle header or "catfishing.net" block header.
        const pattern = /#(\d+)(?:(?!#\d+|catfishing\.net)[\s\S])*?[-–—−]\s*(\d+)\s*\/\s*(\d+)/gi;

        const results: ParsedScore[] = [];

        for (const match of text.matchAll(pattern)) {
            const puzzleId = match[1];
            const score = Number(match[2]);
            const maxScore = Number(match[3]);

            if (Number.isNaN(score) || Number.isNaN(maxScore) || score > maxScore) {
                continue;
            }

            // Require either an explicit "catfishing" / "catfishing.net" marker in the
            // message or a standard 10-point Catfishing share format if pasted standalone.
            if (!hasCatfishingMarker && maxScore !== 10) {
                continue;
            }

            results.push({ puzzleId, score });
        }

        return results;
    },
});
