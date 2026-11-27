const DISCORD_EPOCH_MS = 1_420_070_400_000n;

export function snowflakeToFormattedTime(snowflake: string, timeZone: string): string {
    if (snowflake === '0') return 'beginning-of-channel';
    const ms = Number((BigInt(snowflake) >> 22n) + DISCORD_EPOCH_MS);

    return new Intl.DateTimeFormat('sv-SE', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
    }).format(new Date(ms));
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

    const asUtc = Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour') === 24 ? 0 : get('hour'),
        get('minute'),
        get('second'),
    );

    return asUtc - date.getTime();
}

export function toSqliteUtc(timestamp: string | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toISOString().replace('T', ' ').slice(0, 19);
}

export function getTodayWindowUtc(timeZone: string): {
    startTs: string;
    endTs: string;
} {
    const now = new Date();
    const offsetMs = getTimeZoneOffsetMs(now, timeZone);

    const localNow = new Date(now.getTime() + offsetMs);
    const localMidnightUtc = Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
    );

    const startUtc = new Date(localMidnightUtc - offsetMs);
    const endUtc = new Date(startUtc.getTime() + 86_400_000);

    return {
        startTs: toSqliteUtc(startUtc),
        endTs: toSqliteUtc(endUtc),
    };
}
