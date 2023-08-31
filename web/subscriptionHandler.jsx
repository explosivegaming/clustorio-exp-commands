import { useEffect, useState } from "react";
import { notifyErrorHandler } from "@clusterio/web_ui";
import { SubscriptionRequest } from "../dist/plugin/subscriptionHandler"
import * as lib from "@clusterio/lib";

export default class SubscriptionHandler {
    constructor(event, initialValue, handler) {
        this.event = event;
        this.eventHandlers = [];
        this.subscribed = false;
        this.lastResponse = initialValue;
        this.updateHandler = handler;
    }

    connectControl(control) {
        if (this.control === control) return;
        this.control = control;
        this.control.handle(this.event, event => {
            this.update(this.updateHandler(event, this.lastResponse));
        });
    }

    onUpdate(callback) {
        this.eventHandlers.push(callback);
        if (!this.subscribed) {
		    this.subscribe();
        }
    }

    offUpdate(callback) {
        let index = this.eventHandlers.lastIndexOf(callback);
		if (index === -1) {
			throw new Error("callback is not registered");
		}

		this.eventHandlers.splice(index, 1);
		if (!this.eventHandlers.length) {
			this.unsubscribe();
		}
    }

    update(newValue) {
        this.lastResponse = newValue;
        for (let callback of this.eventHandlers) {
			callback();
		}
    }

    subscribe() {
        if (!this.control || !this.control.connector.connected || this.subscribed) return;
        const entry = lib.Link._eventsByClass.get(this.event);

        this.control.send(
			new SubscriptionRequest("subscribe", entry.name)
		)
        .then(res => {
            this.subscribed = true;
            this.update(res);
        })
        .catch(notifyErrorHandler("Error subscribing to property event"));
    }

    unsubscribe() {
        if (!this.control || !this.control.connector.connected || !this.subscribed) return;
        const entry = lib.Link._eventsByClass.get(this.event);

        this.control.send(
			new SubscriptionRequest("unsubscribe", entry.name)
		)
        .then(() => {
            this.subscribed = false;
        })
        .catch(notifyErrorHandler("Error unsubscribing from property event"));
    }

    use() {
        const [value, setValue] = useState(this.lastResponse);

        useEffect(() => {
            const effectUpdate = () => setValue(this.lastResponse);
            this.onUpdate(effectUpdate);
            return () => this.offUpdate(effectUpdate);
        })

        return value
    }
}