import { Injectable } from "@nestjs/common";
import * as necord from "necord";
import { WeeklyStartDTO } from "./dto/weekly-start.dto";

@Injectable()
export class MeetingsCommands {
    @necord.SlashCommand({
        name: "weekly_start",
        description: "Creates a meeting, starts voice recording and attendance monitoring on a given channel",
    })
    public async onWeeklyStart(@necord.Context() [interaction]: necord.SlashCommandContext, @necord.Options() options: WeeklyStartDTO) {
        await interaction.reply(`Started monitoring channel ${options.channelId.name} for weekly meeting "${options.name}"`);
    }

    @necord.SlashCommand({
        name: "weekly_stop",
        description: "Stops the weekly meeting monitoring, recording and attendance tracking",
    })
    public async onWeeklyStop(@necord.Context() [interaction]: necord.SlashCommandContext) {
        await interaction.reply("Stopped weekly meeting monitoring.");
    }
}