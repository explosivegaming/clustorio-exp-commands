import * as lib from "@clusterio/lib";
import * as messages from "./messages";
import * as Properties from "./subscribableProperty";

lib.definePermission({
	name: "exp_commands.commands.view",
	title: "View Game Commands",
	description: "View all commands defined using ExpCommands across all instances",
	grantByDefault: false
})

const info: lib.PluginInfo = {
	name: "exp_commands",
	title: "ExpGaming Module Commands",
	description: "Provides a command library which handles: registration, input parsing, error handling, and permission checks",
	instanceEntrypoint: "dist/plugin/instance",
	controllerEntrypoint: "dist/plugin/controller",
	webEntrypoint: "./web",
	routes: ["/commands"],
	messages: [
		messages.GetCommandsRequest,
		messages.UpdateCommandsEvent,
		Properties.SubscribablePropertyRequest,
		Properties.SubscribablePropertyUpdateEvent,
	],
};

export default info;