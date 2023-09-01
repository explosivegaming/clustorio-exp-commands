import SubscriptionHandler from "./subscriptionHandler"
import * as lib from "@clusterio/lib";

export default class SubscribableProperty<T> {
    constructor(
        private subscriptions: SubscriptionHandler,
        private event: lib.EventClass<T>,
        public value: T
    ) {
        this.subscriptions.handle(event, async () => this.value);
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