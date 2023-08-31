import * as lib from "@clusterio/lib";

import SubscriptionHandler from "./subscriptionHandler"
import { Command, GetCommandsRequest, UpdateCommandsEvent } from "./messages";

export class ControllerPlugin extends lib.BaseControllerPlugin {
    instance_commands!: Map<number, Array<Command>>;
    master_commands!: Array<Command>;
    subscriptions!: SubscriptionHandler;

    async init() {
        this.instance_commands = new Map();
        this.subscriptions = new SubscriptionHandler(this.controller);
        this.master_commands = [];
        //this.controller.handle(GetCommandsRequest, this.handleGetCommandsRequest.bind(this));
        this.controller.handle(UpdateCommandsEvent, this.handleUpdateCommandsEvent.bind(this));
        this.subscriptions.handle(UpdateCommandsEvent, this.handleUpdateCommandsSubscription.bind(this));
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

        this.master_commands = [...master_set.values()];
        this.subscriptions.broadcast(new UpdateCommandsEvent(this.master_commands));
    }

    async handleUpdateCommandsSubscription() {
        return this.master_commands;
    }
}