import type ControlConnection from "@clusterio/controller/src/ControlConnection";
import { Type, Static } from "@sinclair/typebox";
import * as lib from "@clusterio/lib";

export type NotifyHandler<T> = (connection: ControlConnection) => Promise<T>;
export type EventSubscriberHandler<T> = (event: lib.Event<T>) => Promise<void>;

export type SubscriptionRequestType = "subscribe" | "unsubscribe"
export type SubscriptionResponseResult = "subscribed" | "unsubscribed"

export class SubscriptionResponse {
    constructor(
        public result: SubscriptionResponseResult,
        public eventReplay?: any // Event object for the event subscribed to, not sure how to type
    ) {
    }

    static jsonSchema = Type.Tuple([
        lib.StringEnum(["subscribed", "unsubscribed"]),
        Type.Optional(Type.Any()),
    ])

    toJSON() {
        return [this.result, this.eventReplay];
    }

    static fromJSON(json: Static<typeof SubscriptionResponse.jsonSchema>): SubscriptionResponse {
        return new SubscriptionResponse(json[0], json[1]);
    }
}

export class SubscriptionRequest {
    declare ["constructor"]: typeof SubscriptionRequest;
	static type = "request" as const;
	static src =  "control" as const;
	static dst = "controller" as const;
	static plugin = "exp_commands" as const;
	static permission = "exp_commands.commands.view" as const;
    static Response = SubscriptionResponse;
    
    constructor(
        public type: SubscriptionRequestType,
        public eventName: string,
        public lastRequestTime: number
    ) {
    }

    static jsonSchema = Type.Tuple([
        lib.StringEnum(["subscribe", "unsubscribe"]),
        Type.String(),
        Type.Number()
    ])

    toJSON() {
        return [this.type, this.eventName, this.lastRequestTime];
    }

    static fromJSON(json: Static<typeof SubscriptionRequest.jsonSchema>): SubscriptionRequest {
        return new this(json[0], json[1], json[2]);
    }
}

export class SubscriptionHandler {
    _eventHandlers = new Map<string, lib.RequestHandler<SubscriptionRequest, lib.Event<unknown> | null>>()
    _subscriptions = new Map<string, Set<ControlConnection>>()

    constructor(
        private controller: any
    ) {
        this.controller.handle(SubscriptionRequest, this._handleEvent.bind(this));
    }

    // TODO better types here, lib.RequestHandler<SubscriptionRequest, T> does not work
	handle<T>(Event: lib.EventClass<T>, handler?: lib.RequestHandler<SubscriptionRequest, lib.Event<T> | null>): void;
    handle(
        Event: lib.EventClass<unknown>,
		handler?: lib.RequestHandler<SubscriptionRequest, lib.Event<unknown> | null>,
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
        let eventReplay: lib.Event<unknown> | null = null;
        const handler = this._eventHandlers.get(event.eventName);
		if (handler) {
            eventReplay = await handler(event, src, dst);
        }
        const link: ControlConnection = this.controller.wsServer.controlConnections.get(src.id);
        if (event.type === "subscribe") {
            subscriptions.add(link);
            return new SubscriptionResponse("subscribed", eventReplay);
        } else {
            subscriptions.delete(link);
            return new SubscriptionResponse("unsubscribed");
        }
    }
}

type EventSubscriberState = "subscribing" | "subscribed" | "unsubscribing" | "unsubscribed" | "errored"

export class EventSubscriber<T> {
    _eventHandlers = new Array<EventSubscriberHandler<T>>()
    _state: EventSubscriberState = "unsubscribed";
    lastResponse?: lib.Event<T> = undefined;
    lastResponseTime = 0;

    constructor(
        private _event: lib.EventClass<T>,
        private _control?: any // Controller has no definition
    ) {
        const entry = lib.Link._eventsByClass.get(this._event);
		if (!entry) {
			throw new Error(`Unregistered Event class ${this._event.name}`);
		}
        if (_control) {
            this._control.handle(this._event, this._handle.bind(this));
        }
    }

    _handle(response: lib.Event<T>) {
        console.log("_handle", response);
        this.lastResponse = response;
        this.lastResponseTime = Date.now();
        for (let callback of this._eventHandlers) {
			callback(response);
		}
    }

    connectControl(control: any) {
        if (this._control === control) return;
        this._control = control;
        this._control.handle(this._event, this._handle.bind(this));
    }

    subscribe(handler: EventSubscriberHandler<T>) {
        console.log("subscribe", this._state);
        this._eventHandlers.push(handler);
		this._subscribe();
    }

    unsubscribe(handler: EventSubscriberHandler<T>) {
        let index = this._eventHandlers.lastIndexOf(handler);
		if (index === -1) {
			throw new Error("callback is not registered");
		}

        console.log("unsubscribe", this._state);
		this._eventHandlers.splice(index, 1);
		if (!this._eventHandlers.length) {
			this._unsubscribe();
		}
    }

    async _subscribe() {
        if (!this._control || !this._control.connector.connected || this._state === "subscribed" || this._state === "subscribing") return;
        const entry = lib.Link._eventsByClass.get(this._event)!;
        this._state = "subscribing";
        
        console.log("_subscribe", this._state);
        try {
            const response: SubscriptionResponse = await this._control.send(new SubscriptionRequest("subscribe", entry.name, this.lastResponseTime));
            if (response.result === "subscribed") this._state = "subscribed";
            if (response.eventReplay !== null) {
                this._handle(response.eventReplay);
            }
        } catch {
            this._state = "errored";
        }
        console.log("_subscribe DONE", this._state);
    }

    async _unsubscribe() {
        if (!this._control || !this._control.connector.connected || this._state === "unsubscribed" || this._state === "unsubscribing") return;
        const entry = lib.Link._eventsByClass.get(this._event)!;
        this._state = "unsubscribing";
        
        console.log("_unsubscribe", this._state);
        try {
            const response: SubscriptionResponse = await this._control.send(new SubscriptionRequest("unsubscribe", entry.name, this.lastResponseTime));
            if (response.result === "unsubscribed") this._state = "unsubscribed";
        } catch {
            this._state = "errored";
        }
        console.log("_unsubscribe DONE", this._state);
    }
}