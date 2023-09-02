import { SubscriptionHandler, SubscriptionRequest } from "./subscriptionHandler"
import * as lib from "@clusterio/lib";

export class SubscribableProperty<T> {
    constructor(
        private subscriptions: SubscriptionHandler,
        private event: lib.EventClass<T>,
        public value: T
    ) {
        this.subscriptions.handle(event, this.handleSubscription.bind(this));
    }

    async handleSubscription(request: SubscriptionRequest) {
        if (request.lastRequestTime < Date.now()) {
            return new this.event(this.value);
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