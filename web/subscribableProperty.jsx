import { useEffect, useState } from "react";
import { notifyErrorHandler } from "@clusterio/web_ui";
import * as Properties from "../dist/plugin/subscribableProperty";

export default class SubscribableProperty {
    constructor(initialValue) {
        this.value = initialValue;
        this.callbacks = [];
        this.subscribed = false;
        this.control = null;
    }

    connectController(control) {
        if (this.control === control) return;
        this.control = control;
        this.control.handle(Properties.SubscribablePropertyUpdateEvent, event => {
            this.update(event.value);
        });
    }

    onUpdate(callback) {
        this.callbacks.push(callback);
        if (!this.subscribed) {
		    this.subscribe();
        }
    }

    offUpdate(callback) {
        let index = this.callbacks.lastIndexOf(callback);
		if (index === -1) {
			throw new Error("callback is not registered");
		}

		this.callbacks.splice(index, 1);
		if (!this.callbacks.length) {
			this.unsubscribe();
		}
    }

    update(newValue) {
        this.value = newValue;
        for (let callback of this.callbacks) {
			callback();
		}
    }

    subscribe() {
        if (!this.control || !this.control.connector.connected) return;

        this.control.send(
			new Properties.SubscribablePropertyRequest("subscribe")
		)
        .then(value => {
            this.subscribed = true;
            this.update(value);
        })
        .catch(notifyErrorHandler("Error subscribing to property event"));
    }

    unsubscribe() {
        if (!this.control || !this.control.connector.connected) return;

        this.control.send(
			new Properties.SubscribablePropertyRequest("unsubscribe")
		)
        .then(() => {
            this.value = null;
            this.subscribed = false;
        })
        .catch(notifyErrorHandler("Error unsubscribing from property event"));
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