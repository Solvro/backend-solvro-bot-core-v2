import { Injectable } from '@nestjs/common';
import * as necord from 'necord';

@Injectable()
export class AppService {
    getHello(): string {
        return 'Hello World!';
    }

    @necord.SlashCommand({
        name: 'ping',
        description: 'Replies with Pong!',
    })
    public async onPing(@necord.Context() [interaction]: necord.SlashCommandContext) {
        return interaction.reply({ content: 'Pong!' });
    }
}
