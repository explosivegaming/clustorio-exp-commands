import * as lib from "@clusterio/lib";

import { Command, UpdateCommandsEvent } from "./messages";

export class InstancePlugin extends lib.BaseInstancePlugin {
    async onStart() {
        const response = await this.sendRcon("/_system-rcon return { all = table.get_keys(Commands.registered_commands), disabled = Commands.get_disabled_commands() }");
        let commands
        try {
            commands = JSON.parse(response);
        } catch(error) {
            const message = error instanceof Error ? error.message : String(error)
            this.logger.error(`Failed to parse command json. Reason: ${message} Response: ${response} `)
            return;
        }

        const formatted = [];
        if (commands.disabled instanceof Array) {
            for (let command of commands.all) {
                formatted.push(new Command(command, !commands.disabled.includes(command)))
            }
        } else {
            for (let command of commands.all) {
                formatted.push(new Command(command, true))
            }
        }

        this.instance.sendTo("controller", new UpdateCommandsEvent(formatted))
    }
}