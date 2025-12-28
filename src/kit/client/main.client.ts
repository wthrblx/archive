import Vide from "@rbxts/vide";
// strict mode runs effects twice
Vide.strict = false;

import { Flamework } from "@flamework/core";
import { flameworkIgnited, panic } from "core/shared/flamework";
import { createLogger } from "core/shared/logger";

const logger = createLogger("main");

try {
	Flamework.addPaths("src/kit/client/controllers");
	Flamework.addPaths("src/core/client/controllers");
	Flamework.addPaths("src/core/client/hook-managers");
	Flamework.addPaths("src/core/shared/hook-managers");
	Flamework.ignite();
	flameworkIgnited();
	logger.info("Client ignited!");
} catch (e) {
	panic(`Failed to ignite client; ${e}`);
}
