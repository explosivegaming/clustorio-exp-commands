import * as lib from "@clusterio/lib";
import * as messages from "./messages";
import { SubscriptionRequest } from "./subscriptionHandler"

lib.definePermission({
	name: "exp_commands.commands.view",
	title: "View Game Commands",
	description: "View all commands defined using ExpCommands across all instances",
	grantByDefault: false
})

const info: lib.PluginDeclaration = {
	name: "exp_commands",
	title: "ExpGaming Module Commands",
	description: "Provides a command library which handles: registration, input parsing, error handling, and permission checks",
	instanceEntrypoint: "dist/plugin/instance",
	controllerEntrypoint: "dist/plugin/controller",
	webEntrypoint: "./web",
	routes: ["/commands"],
	messages: [
		messages.UpdateCommandsEvent,
		SubscriptionRequest,
	],
};

export default info;