import { InteractionResponseType } from 'discord-api-types/v10';

import { defineBareCommand } from './utils';

export const helloCommand = defineBareCommand({
    meta: {
        name: 'hello',
        description: 'Replies with a greeting',
    },
    execute() {
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: 'Hello World!' },
        };
    },
});
