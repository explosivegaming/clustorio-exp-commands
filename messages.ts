import { Type, Static } from "@sinclair/typebox";
import { PropertyMapDifference } from "./subscribableProperty";
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

export class UpdateCommandsEvent_Array {
	declare ["constructor"]: typeof UpdateCommandsEvent;
	static type = "event" as const;
	static src = ["instance", "controller"] as const;
	static dst = ["controller", "control"] as const;
	static plugin = "exp_commands" as const;

	constructor(
		public commands: Array<Command> = [],
	) {
	}

	static jsonSchema = Type.Array(Command.jsonSchema);

	static fromJSON(json: Static<typeof UpdateCommandsEvent_Array.jsonSchema>): UpdateCommandsEvent_Array {
		return new this(json.map(c => Command.fromJSON(c)));
	}

	toJSON() {
		return this.commands;
	}

	static fromProperty(newValue: Array<Command>, oldValue: Array<Command> | null): UpdateCommandsEvent_Array {
		return new this(newValue);
	}

	toProperty(oldValue: Array<Command>): Array<Command> {
		return this.commands;
	}
}

export class UpdateCommandsEvent {
	declare ["constructor"]: typeof UpdateCommandsEvent;
	static type = "event" as const;
	static src = ["instance", "controller"] as const;
	static dst = ["controller", "control"] as const;
	static plugin = "exp_commands" as const;
	commands: PropertyMapDifference<string, Command>;

	constructor(
		changed: Map<string, Command> = new Map(),
        removed: Array<string> = [],
	) {
		this.commands = new PropertyMapDifference(changed, removed);
	}

	static jsonSchema = Type.Tuple([
		Type.Array(Type.Tuple([
            Type.String(), Command.jsonSchema
        ])),
        Type.Array(Type.String())
	])

	static fromJSON(json: Static<typeof UpdateCommandsEvent.jsonSchema>): UpdateCommandsEvent {
		return new this(new Map(json[0].map(v => [v[0], Command.fromJSON(v[1])])), json[1]);
	}

	toJSON() {
		return this.commands.toJSON();
	}

	static fromProperty(newValue: Map<string, Command>, oldValue: Map<string, Command> | null): UpdateCommandsEvent {
		const rtn = new this();
		rtn.commands = PropertyMapDifference.fromProperty(newValue, oldValue);
		return rtn;
	}

	toProperty(oldValue: Map<string, Command>): Map<string, Command> {
		return this.commands.toProperty(oldValue);
	}
}