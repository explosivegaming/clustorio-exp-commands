import { useEffect, useState } from "react";
import SubscriptionHandler from "./subscriptionHandler";

export default class SubscribableProperty extends SubscriptionHandler {
    constructor(event, initialValue, parseResponse) {
        super(event)
        this.value = initialValue;
        this.parseResponse = parseResponse;
    }

    async _handle(response) {
        this.lastResponse = response;
        this.lastResponseTime = Date.now();
        this.value = this.parseResponse(response);
        for (let callback of this._eventHandlers) {
			callback(this.value);
		}
    }

    use() {
        const [value, setValue] = useState(this.value);
        
        useEffect(() => {
            const update = () => setValue(this.value);
            this.subscribe(update);
            return () => this.unsubscribe(update);
        }, [])

        return value
    }

}