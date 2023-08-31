import { Type, Static } from "@sinclair/typebox";
import * as lib from "@clusterio/lib";

export class Command {
    constructor(
        public name: string,
        public enabled: boolean
    ) {}

    static jsonSchema = Type.Tuple([
        Type.String(), Type.Boolean()
    ])

    toJSON() {
        return [this.name, this.enabled]
    }

    static fromJSON(json: Static<typeof Command.jsonSchema>): Command {
        return new Command(json[0], json[1]);
    }
}

export class GetCommandsRequest {
    declare ["constructor"]: typeof GetCommandsRequest;
	static type = "request" as const;
	static src =  "control" as const;
	static dst = "controller" as const;
	static plugin = "exp_commands" as const;
	static permission = "exp_commands.commands.view" as const;
	static Response = lib.jsonArray(Command);
}

export class UpdateCommandsEvent {
	declare ["constructor"]: typeof UpdateCommandsEvent;
	static type = "event" as const;
	static src = ["instance", "controller"] as const;
	static dst = ["controller", "control"] as const;
	static plugin = "exp_commands" as const;

	constructor(
		public commands: Command[]
	) {
	}

	static jsonSchema = Type.Object({
		"commands": Type.Array(Command.jsonSchema)
	})

	static fromJSON(json: Static<typeof UpdateCommandsEvent.jsonSchema>): UpdateCommandsEvent {
		return new this(json.commands.map(command => Command.fromJSON(command)));
	}
}