import type ControlConnection from "@clusterio/controller/src/ControlConnection";
import { Type, Static } from "@sinclair/typebox";
import * as lib from "@clusterio/lib";

export type NotifyHandler<T> = (connection: ControlConnection) => Promise<T>;

export class SubscriptionRequest {
    declare ["constructor"]: typeof SubscriptionRequest;
	static type = "request" as const;
	static src =  "control" as const;
	static dst = "controller" as const;
	static plugin = "exp_commands" as const;
	static permission = "exp_commands.commands.view" as const;
    static Response = { jsonSchema: Type.Any(), fromJSON(json: any) { return json; }, };
    
    constructor(
        public type: string,
        public eventName: string,
    ) {
    }

    static jsonSchema = Type.Object({
        "type": Type.String(),
        "eventName": Type.String(),
    })

    static fromJSON(json: Static<typeof SubscriptionRequest.jsonSchema>): SubscriptionRequest {
        return new this(json.type, json.eventName);
    }
}

export default class SubscriptionHandler {
    _eventHandlers = new Map<string, lib.RequestHandler<unknown, unknown>>()
    _subscriptions = new Map<string, Set<ControlConnection>>()

    constructor(
        private controller: any
    ) {
        this.controller.handle(SubscriptionRequest, this._handleEvent.bind(this));
    }

	handle<T>(Event: lib.EventClass<T>, handler?: lib.RequestHandler<T, any>): void;
    handle(
        Event: lib.EventClass<unknown>,
		handler?: lib.RequestHandler<unknown, unknown>,
    ) {
        const entry = lib.Link._eventsByClass.get(Event);
		if (!entry) {
			throw new Error(`Unregistered Event class ${Event.name}`);
		}
		if (this._subscriptions.has(entry.name)) {
			throw new Error(`Event ${entry.name} is already registered`);
		}
        if (handler) {
            this._eventHandlers.set(entry.name, handler);
        }
        this._subscriptions.set(entry.name, new Set());
    }

    broadcast<T>(event: lib.Event<T>): void;
    broadcast(event: lib.Event<unknown>) {
        const entry = lib.Link._eventsByClass.get(event.constructor);
        if (!entry) {
			throw new Error(`Unregistered Event class ${Event.name}`);
		}
        const subscriptions = this._subscriptions.get(entry.name);
        if (!subscriptions) {
            throw new Error(`Event ${entry.name} is not a registered as subscribable`);
		}
        for (let link of subscriptions) {
			link.send(event);
		}
    }

	notify<T>(Event: lib.EventClass<T>, handler: NotifyHandler<lib.Event<T>>): void;
	async notify(
        Event: lib.EventClass<unknown>,
		handler: NotifyHandler<lib.Event<unknown>>
    ) {
		const entry = lib.Link._eventsByClass.get(Event);
        if (!entry) {
			throw new Error(`Unregistered Event class ${Event.name}`);
		}
        const subscriptions = this._subscriptions.get(entry.name);
        if (!subscriptions) {
            throw new Error(`Event ${entry.name} is not a registered as subscribable`);
		}
        for (let link of subscriptions) {
			link.send(await handler(link));
		}
	}

    async _handleEvent(event: SubscriptionRequest, src: lib.Address, dst: lib.Address) {
        if (!lib.Link._eventsByName.has(event.eventName)) {
            throw new Error(`Event ${event.eventName} is not a registered event`);
		}
        const subscriptions = this._subscriptions.get(event.eventName);
        if (!subscriptions) {
            throw new Error(`Event ${event.eventName} is not a registered as subscribable`);
		}
        const link: ControlConnection = this.controller.wsServer.controlConnections.get(src.id);
        if (event.type === "subscribe") {
            subscriptions.add(link);
        } else {
            subscriptions.delete(link);
        }
        const handler = this._eventHandlers.get(event.eventName);
		if (handler) {
            return await handler(event, src, dst);
        } else {
            return null;
        }
    }
}