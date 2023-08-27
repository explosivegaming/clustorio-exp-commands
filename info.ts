import * as lib from "@clusterio/lib";

const info: lib.PluginInfo = {
	name: "exp_commands",
	title: "ExpGaming Module Commands",
	description: "Provides a command library which handles: registration, input parsing, error handling, and permission checks",
	instanceEntrypoint: "dist/plugin/instance",
	messages: [
	],
};

export default info;