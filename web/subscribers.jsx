import { useEffect, useState } from "react";
import { EventSubscriber } from "../dist/plugin/subscriptionHandler";
import { PropertySubscriber } from "../dist/plugin/subscribableProperty";

export class SubscribableEvent extends EventSubscriber {
    use() {
        const [lastResponse, setLastResponse] = useState(this.lastResponse);

        useEffect(() => {
            const update = () => setLastResponse(this.lastResponse);
            this.subscribe(update);
            return () => this.unsubscribe(update);
        }, [])

        return lastResponse
    }
}

export class SubscribableProperty extends PropertySubscriber {
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