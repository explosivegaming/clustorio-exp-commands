import { useEffect, useState } from "react";
import SubscriptionHandler from "./subscriptionHandler";

export default class SubscribableProperty extends SubscriptionHandler {
    constructor(event, initialValue, parseResponse) {
        super(event)
        this.value = initialValue;
        this.parseResponse = parseResponse;
    }

    _handle(response) {
        this.lastResponse = response;
        this.value = this.parseResponse(response);
        for (let callback of this.eventHandlers) {
			callback();
		}
    }

    use() {
        const [value, setValue] = useState(this.value);
        
        useEffect(() => {
            const effectUpdate = () => setValue(this.value);
            this.onUpdate(effectUpdate);
            return () => this.offUpdate(effectUpdate);
        })

        return value
    }

}