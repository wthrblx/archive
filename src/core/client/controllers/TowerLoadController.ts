import { Controller } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { Trove } from "@rbxts/trove";
import { LogBenchmark } from "core/shared/decorators";
import { TowerInstance } from "core/shared/types";
import { BackgroundMusicController } from "./BackgroundMusicController";
import { Kit, KitController } from "./KitController";

@Controller()
export class TowerLoadController {
	constructor(
		private kitController: KitController,
		private backgroundMusicController: BackgroundMusicController,
	) {}

	@LogBenchmark()
	async loadTower(outerTrove: Trove, tower: TowerInstance) {
		const trove = outerTrove.extend();
		tower.Parent = Workspace;
		trove.add(tower);
		this.backgroundMusicController.consumeMusicZones(trove, tower.BackgroundMusicZones);
		this.kitController.initKit(
			trove,
			new Kit(tower.Mechanics, tower.Spawn, "tower").useModules(
				this.kitController.defaultKitTags.getValueWithoutLoadingOrThrow(),
			),
		);
		return tower;
	}
}
