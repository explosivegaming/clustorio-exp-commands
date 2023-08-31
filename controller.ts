import * as lib from "@clusterio/lib";

import * as Properties from "./subscribableProperty"
import { Command, GetCommandsRequest, UpdateCommandsEvent } from "./messages";

export class ControllerPlugin extends lib.BaseControllerPlugin {
    instance_commands!: Map<number, Array<Command>>;
    master_commands!: Properties.SubscribableProperty<Array<Command>>;

    async init() {
        this.instance_commands = new Map();
        this.master_commands = new Properties.SubscribableProperty<Array<Command>>(this.controller, []);
        this.controller.handle(UpdateCommandsEvent, this.handleUpdateCommandsEvent.bind(this));
        this.controller.handle(GetCommandsRequest, this.handleGetCommandsRequest.bind(this));
    }

    async handleGetCommandsRequest() {
        return this.master_commands;
    }

    async handleUpdateCommandsEvent(event: UpdateCommandsEvent, src: lib.Address) {
        this.instance_commands.set(src.id, event.commands);

        const master_set: Map<string, Command> = new Map();
        for (let commands of this.instance_commands.values()) {
            for (let command of commands) {
                master_set.set(command.name, command);
            }
        }

        console.log(master_set);
        this.master_commands.broadcastNewValue([...master_set.values()])
    }
}