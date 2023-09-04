import { EventSubscriber, SubscriptionHandler, SubscriptionRequest } from "./subscriptionHandler"
import { Type, Static, TSchema } from "@sinclair/typebox";
import * as lib from "@clusterio/lib";

export type PropertyResponseConstructor<T,V> = (value: V) => lib.Event<T>;
export type PropertyResponseParser<T,V> = (event: lib.Event<T>) => V;

export interface SubscribablePropertyEvent<T, V> extends lib.Event<T> {
    constructor: SubscribablePropertyEventClass<T, V>;
    toProperty(oldValue: V): V;
}

export interface SubscribablePropertyEventClass<T, V> extends lib.EventClass<T> {
    fromProperty(newValue: V, oldValue: V | null): lib.Event<T>;
    new (...args: any): SubscribablePropertyEvent<T, V>;
}

export class SubscribableProperty<T> {
    lastSetTime: number;

    constructor(
        private subscriptions: SubscriptionHandler,
        private event: SubscribablePropertyEventClass<unknown, T>,
        private value: T,
    ) {
        this.lastSetTime = Date.now();
        this.subscriptions.handle(event, this.handleSubscription.bind(this));
    }

    async handleSubscription(request: SubscriptionRequest) {
        if (request.lastRequestTime <= this.lastSetTime) {
            return this.event.fromProperty(this.value, null);
        } else {
            return null;
        }
    }

    get() {
        return this.value;
    }

    set(newValue: T) {
        this.subscriptions.broadcast(this.event.fromProperty(newValue, this.value));
        this.lastSetTime = Date.now();
        this.value = newValue;
    }

    broadcast() {
        this.subscriptions.broadcast(this.event.fromProperty(this.value, null));
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

export class PropertySetDifference<T> {
    constructor(
        public added: Array<T> = [],
        public removed: Array<T> = [],
    ) {
    }

    static jsonSchema = Type.Tuple([
		Type.Array(Type.Unknown()), Type.Array(Type.Unknown())
	])

    static newJsonSchema<T extends TSchema>(valueType: T) {
        return Type.Tuple([
            Type.Array(valueType), Type.Array(valueType)
        ])
    }

    static fromJSON<T>(json: Static<typeof PropertySetDifference.jsonSchema>): PropertySetDifference<T>;
	static fromJSON(json: any): PropertySetDifference<unknown> {
		return new this(json[0], json[1]);
	}

    toJSON() {
        return [this.added, this.removed];
    }

    static fromProperty<T>(newValue: Set<T>, oldValue: Set<T>): PropertySetDifference<T>
    static fromProperty(newValue: Set<unknown>, oldValue: Set<unknown>): PropertySetDifference<unknown> {
        const setDifference = new this();
        for (let value of newValue) {
            if (!oldValue.has(value)) setDifference.added.push(value);
        }
        for (let value of oldValue) {
            if (!newValue.has(value)) setDifference.removed.push(value);
        }
        return setDifference;
    }

    toProperty(oldValue: Set<T>): Set<T> {
        for (let value of this.added) {
            oldValue.add(value);
        }
        for (let value of this.removed) {
            oldValue.delete(value);
        }
        return oldValue;
    }
}

export class PropertyMapDifference<K,V> {
    constructor(
        public changed: Map<K,V> = new Map(),
        public removed: Array<K> = [],
    ) {
    }

    static jsonSchema = Type.Tuple([
		Type.Array(Type.Tuple([
            Type.Unknown(), Type.Unknown()
        ])),
        Type.Array(Type.Unknown())
	])

    static newJsonSchema<K extends TSchema, V extends TSchema>(keyType: K, valueType: V) {
        return Type.Tuple([
            Type.Array(Type.Tuple([
                keyType, valueType
            ])),
            Type.Array(keyType)
        ])
    }

    static fromJSON<K,V>(json: Static<typeof PropertyMapDifference.jsonSchema>): PropertyMapDifference<K,V>;
	static fromJSON(json: Static<typeof PropertyMapDifference.jsonSchema>): PropertyMapDifference<unknown, unknown> {
		return new this(new Map(json[0]), json[1]);
	}

    toJSON() {
        return [[...this.changed.entries()], this.removed];
    }

    static fromProperty<K,V>(newValue: Map<K, V>, oldValue: Map<K, V> | null): PropertyMapDifference<K,V>;
    static fromProperty(newValue: Map<unknown, unknown>, oldValue: Map<unknown, unknown> | null): PropertyMapDifference<unknown, unknown> {
        const mapDifference = new this();
        if (oldValue === null) {
            for (let [key, value] of newValue.entries()) {
                mapDifference.changed.set(key, value);
            }
            return mapDifference;
        }
        for (let [key, value] of newValue.entries()) {
            if (oldValue.get(key) !== value) mapDifference.changed.set(key, value);
        }
        for (let value of oldValue) {
            if (!newValue.has(value)) mapDifference.removed.push(value);
        }
        return mapDifference;
    }

    toProperty(oldValue: Map<K,V>): Map<K,V> {
        for (let [key, value] of this.changed.entries()) {
            oldValue.set(key, value);
        }
        for (let value of this.removed) {
            oldValue.delete(value);
        }
        return new Map(oldValue);
    }
}