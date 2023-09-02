import { useEffect, useState } from "react";
import { EventSubscriber } from "../dist/plugin/subscriptionHandler"
import * as lib from "@clusterio/lib";

export default class SubscriptionHandler extends EventSubscriber {
    constructor(event) {
        super(event);
    }

    use() {
        console.log("Use SubscriptionHandler");
        const [lastResponse, setLastResponse] = useState(this.lastResponse);

        useEffect(() => {
            console.log("Effect SubscriptionHandler");
            const update = () => setLastResponse(this.lastResponse);
            this.subscribe(update);
            return () => this.unsubscribe(update);
        }, [])

        return lastResponse
    }
}