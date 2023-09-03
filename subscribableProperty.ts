import { EventSubscriber, SubscriptionHandler, SubscriptionRequest } from "./subscriptionHandler"
import * as lib from "@clusterio/lib";

export type PropertyResponseConstructor<T,V> = (value: V) => lib.Event<T>;
export type PropertyResponseParser<T,V> = (event: lib.Event<T>) => V;

export interface SubscribablePropertyEvent<T, V> extends lib.Event<T> {
    constructor: SubscribablePropertyEventClass<T, V>;
    toProperty(oldValue: V): V;
}

export interface SubscribablePropertyEventClass<T, V> extends lib.EventClass<T> {
    fromProperty(newValue: V, oldValue: V): lib.Event<T>;
    new (...args: any): SubscribablePropertyEvent<T, V>;
}

export class SubscribableProperty<T> {
    constructor(
        private subscriptions: SubscriptionHandler,
        private event: SubscribablePropertyEventClass<unknown, T>,
        private value: T,
    ) {
        this.subscriptions.handle(event, this.handleSubscription.bind(this));
    }

    async handleSubscription(request: SubscriptionRequest) {
        if (request.lastRequestTime < Date.now()) {
            return this.event.fromProperty(this.value, this.value);
        } else {
            return null;
        }
    }

    get() {
        return this.value;
    }

    set(newValue: T) {
        this.value = newValue
        this.subscriptions.notify(this.event, async () => {
            return new this.event(this.value);
        })
    }
}

export class PropertySubscriber<T> extends EventSubscriber<T> {
    constructor(
        _event: SubscribablePropertyEventClass<unknown, T>,
        private value: T,
        _control?: lib.Link
    ) {
        super(_event, _control);
    }

    async _handle(response: SubscribablePropertyEvent<unknown, T>) {
        this.lastResponse = response;
        this.lastResponseTime = Date.now();
        this.value = response.toProperty(this.value);
        for (let callback of this._eventHandlers) {
			callback(response);
		}
    }
}