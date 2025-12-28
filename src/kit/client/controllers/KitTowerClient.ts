import { Controller, OnInit, OnStart } from "@flamework/core";
import Iris from "@rbxts/iris";
import { Workspace } from "@rbxts/services";
import { Trove } from "@rbxts/trove";
import { DeveloperPanelDropdownRenderer } from "core/client/controllers/DeveloperPanelController";
import { Kit, KitController } from "core/client/controllers/KitController";
import { onFlameworkExtinguished } from "core/shared/flamework";
import { createLogger } from "core/shared/logger";
import { confirmKitLoaded, loadKitMechanics } from "../net";

@Controller()
export class KitTowerClient implements OnStart, DeveloperPanelDropdownRenderer, OnInit {
	private logger = createLogger("KitTowerClient");
	private isLoaded = false;

	constructor(private kitController: KitController) {}

	onInit(): void | Promise<void> {
		error("WHAT DO YOU MEAN");
	}

	async onStart(): Promise<void> {
		print(this);
		print("Requesting server for kit mechanics");
		const mechanics = await loadKitMechanics.invoke();
		print(mechanics);
		if (mechanics) {
			const clonedMechanics = mechanics.Clone();
			clonedMechanics.Parent = Workspace;

			confirmKitLoaded.fire();

			const trove = new Trove();
			this.kitController.initKit(
				trove,
				new Kit(clonedMechanics, undefined as never, "tower").useModules(
					this.kitController.defaultKitTags.getValueWithoutLoadingOrThrow(),
				),
			);

			this.isLoaded = true;
			onFlameworkExtinguished(() => trove.clean());
		}
	}

	renderDeveloperPanelDropdown(): void {
		Iris.Text([this.isLoaded ? "Mechanics are loaded" : "Mechanics are NOT loaded"]);
	}
}
