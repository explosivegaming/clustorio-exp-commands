import type ControlConnection from "@clusterio/controller/src/ControlConnection";
import { Type, Static } from "@sinclair/typebox";
import * as lib from "@clusterio/lib";

export class SubscribableProperty<T> {
	subscribedControlLinks!: Set<ControlConnection>;

    constructor(
        private controller: any, // Controller is not yet defined
        public value: T
    ) {
        this.controller.handle(SubscribablePropertyRequest, this.handleEvent.bind(this));
        this.subscribedControlLinks = new Set()
    }

    async handleEvent(request: SubscribablePropertyRequest, src: lib.Address) {
        let link = this.controller.wsServer.controlConnections.get(src.id);
		if (request.type === "subscribe") {
			this.subscribedControlLinks.add(link);
            return this.value;
		} else {
			this.subscribedControlLinks.delete(link);
            return null;
		}
    }

    broadcastNewValue(newValue: T) {
        this.value = newValue;
        const updateData = new SubscribablePropertyUpdateEvent<T>(newValue);
        for (let link of this.subscribedControlLinks) {
			link.send(updateData);
		}
    }
}

export class SubscribablePropertyRequest {
    declare ["constructor"]: typeof SubscribablePropertyRequest;
	static type = "request" as const;
	static src =  "control" as const;
	static dst = "controller" as const;
	static plugin = "exp_commands" as const;
	static permission = "exp_commands.commands.view" as const;
    static Response = { jsonSchema: {}, fromJSON(json: any) { return json; }, };
    
    constructor(
        public type: string
    ) {
    }

    static jsonSchema = Type.Object({
        "type": Type.String()
    })

    static fromJSON(json: Static<typeof SubscribablePropertyRequest.jsonSchema>): SubscribablePropertyRequest {
        return new this(json.type);
    }
}

export class SubscribablePropertyUpdateEvent<T> {
    declare ["constructor"]: typeof SubscribablePropertyUpdateEvent;
	static type = "event" as const;
	static src =  "controller" as const;
	static dst = "control" as const;
	static plugin = "exp_commands" as const;
    
    constructor(
        public value: T
    ) {
    }

    static jsonSchema = Type.Object({
        "value": Type.Any()
    })

    static fromJSON(json: Static<typeof SubscribablePropertyUpdateEvent.jsonSchema>): SubscribablePropertyUpdateEvent<any> {
        return new this(json.value);
    }
}