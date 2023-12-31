import * as lib from "@clusterio/lib";

import { SubscriptionHandler } from "./subscriptionHandler";
import { SubscribableProperty } from "./subscribableProperty";
import { Command, UpdateCommandsEvent } from "./messages";

export class ControllerPlugin extends lib.BaseControllerPlugin {
    instance_commands!: Map<number, Map<string, Command>>;
    master_commands!: SubscribableProperty<Map<string, Command>>;
    subscriptions!: SubscriptionHandler;

    async init() {
        this.instance_commands = new Map();
        this.subscriptions = new SubscriptionHandler(this.controller);
        this.master_commands = new SubscribableProperty(this.subscriptions, UpdateCommandsEvent, new Map());
        this.controller.handle(UpdateCommandsEvent, this.handleUpdateCommandsEvent.bind(this));
    }

    async handleUpdateCommandsEvent(event: UpdateCommandsEvent, src: lib.Address) {
        this.instance_commands.set(src.id, event.toProperty(new Map()));

        const master_set: Map<string, Command> = new Map();
        for (let commands of this.instance_commands.values()) {
            for (let command of commands.values()) {
                master_set.set(command.name, command);
            }
        }

        this.master_commands.set(master_set);
    }
}