import { Controller, OnInit } from "@flamework/core";
import { atom, effect } from "@rbxts/charm";
import { Lazy } from "@rbxts/lazy";
import ty from "@rbxts/libopen-ty";
import { CollectionService, RunService } from "@rbxts/services";
import { t } from "@rbxts/t";
import { Trove } from "@rbxts/trove";
import { addBinding } from "core/shared/bindings";
import { LogBenchmark } from "core/shared/decorators";
import { createLogger } from "core/shared/logger";

export type KitType = "tower" | "area";

export class Kit {
	readonly modules = new Array<object>();

	constructor(
		readonly kitObjectsParent: Instance,
		readonly spawn: BasePart,
		readonly kitType: KitType = "tower",
	) {}

	useModules(objects: object[]) {
		this.modules.move(0, objects.size() - 1, this.modules.size(), this.modules);
		return this;
	}

	useModuleScripts(instances: Instance[]) {
		for (const v of instances) {
			if (v.IsA("ModuleScript")) this.modules.push(require(v) as never);
		}
		return this;
	}
}

export interface Tagged<T extends Instance> {
	implements: { Tagged: true };
	tag: string;
	tagCheck?: t.check<T>;
	tagged(trove: Trove, instance: T): void;
}

const Tagged = ty
	.Struct(
		{ exhaustive: false },
		{
			implements: ty.Struct({ exhaustive: false }, { Tagged: ty.True }),
			tag: ty.String,
			tagCheck: ty.Function.Optional(),
			tagged: ty.Function,
		},
	)
	.Nicknamed("Tagged")
	.Retype<Tagged<Instance>>();

export interface OnKitLoad {
	implements: { OnKitLoad: true };
	onKitLoad(kit: Kit): void;
}

const OnKitLoad = ty
	.Struct(
		{ exhaustive: false },
		{
			implements: ty.Struct({ exhaustive: false }, { OnKitLoad: ty.True }),
			onKitLoad: ty.Function,
		},
	)
	.Nicknamed("OnKitLoad")
	.Retype<OnKitLoad>();

// export interface MountsUi {
// 	implements: { MountsUi: true };
// 	mountUi(): ScreenGui;
// }

// const MountsUi = ty
// 	.Struct(
// 		{ exhaustive: false },
// 		{
// 			implements: ty.Struct({ exhaustive: false }, { MountsUi: ty.True }),
// 			mountUi: ty.Function,
// 		},
// 	)
// 	.Nicknamed("MountsUi")
// 	.Retype<MountsUi>();

export interface OnTick {
	implements: { OnTick: true };
	onTick(dt: number): void;
}

const OnTick = ty
	.Struct(
		{ exhaustive: false },
		{
			implements: ty.Struct({ exhaustive: false }, { OnTick: ty.True }),
			onTick: ty.Function,
		},
	)
	.Nicknamed("OnTick")
	.Retype<OnTick>();

export const OBSERVED_TAG_PREFIX = "OBSERVED_TAG_";

// TODO: Traits are hardcoded rn, can we maybe do smth like Fusion's
// specialkeys?
@Controller()
export class KitController implements OnInit {
	private logger = createLogger("KitController");

	private tickOnPreSimulation = atom(false);
	private tickInterval = atom(1 / 60);
	private onTick = new Set<OnTick>();

	readonly defaultKitTags = new Lazy(() => {
		this.logger.info("Collecting default kit tags");
		const modules = new Array<object>();
		// for (const mod of Workspace.WaitForChild("KitTags").GetDescendants()) {
		// 	if (mod.IsA("ModuleScript")) modules.push(require(mod) as never);
		// }
		this.logger.info("Finished collecting default kit tags");
		return modules;
	});

	@LogBenchmark()
	initKit(trove: Trove, kit: Kit) {
		const instanceTroves = new Map<Instance, Trove>();
		const tagsToObserve = new Map<string, string>();
		const onKitLoad = new Set<OnKitLoad>();

		for (const mod of kit.modules) {
			print(mod);
			if (Tagged.Matches(mod)) {
				const tagged = mod as Tagged<Instance>;
				const { tag, tagCheck } = tagged;
				const observedTag = OBSERVED_TAG_PREFIX + tag;

				this.logger.trace("Now observing tag", tag, "as", observedTag);

				tagsToObserve.set(tag, observedTag);

				trove.connect(
					CollectionService.GetInstanceAddedSignal(observedTag),
					tagCheck
						? (instance) => {
								this.logger.trace(
									"Got tagged instance",
									instance.GetFullName(),
									"for",
									tag,
									"as",
									observedTag,
								);
								if (tagCheck(instance)) {
									this.logger.trace("Instance passed check, now tagging");
									const instanceTrove = trove.extend();
									instanceTrove.attachToInstance(instance);
									instanceTrove.add(instance);
									tagged.tagged(instanceTrove, instance);
								}
							}
						: (instance) => {
								this.logger.trace(
									"Got tagged instance",
									instance.GetFullName(),
									"for",
									tag,
									"as",
									observedTag,
								);
								const instanceTrove = trove.extend();
								instanceTrove.add(() => {
									const currentInstanceTrove = instanceTroves.get(instance);
									if (currentInstanceTrove === instanceTrove) instanceTroves.delete(instance);
								});
								instanceTrove.attachToInstance(instance);
								tagged.tagged(instanceTrove, instance);
							},
				);

				trove.connect(CollectionService.GetInstanceRemovedSignal(observedTag), (instance) => {
					const instanceTrove = instanceTroves.get(instance);
					if (instanceTrove) {
						instanceTroves.delete(instance);
						instanceTrove.clean();
					}
				});
			}

			if (OnKitLoad.Matches(mod)) {
				onKitLoad.add(mod as OnKitLoad);
			}
		}

		for (const descendant of kit.kitObjectsParent.GetDescendants()) {
			for (const [tag, observedTag] of pairs(tagsToObserve)) {
				if (descendant.HasTag(tag)) descendant.AddTag(observedTag);
			}
		}

		for (const struct of onKitLoad) {
			task.spawn((struct, kit) => struct.onKitLoad(kit), struct, kit);
		}
	}

	private tick(dt: number) {
		for (const struct of this.onTick) task.spawn((struct, dt) => struct.onTick(dt), struct, dt);
	}

	@LogBenchmark()
	onInit(): void {
		print("Im literally initing fym");
		addBinding("@core/KitController/isTickOnPreSimulation", () => this.tickOnPreSimulation());
		addBinding("@core/KitController/setTickOnPreSimulation", (tick: unknown) =>
			this.tickOnPreSimulation(ty.Boolean.CastOrError(tick)),
		);

		addBinding("@core/KitController/getTickInterval", () => this.tickInterval());
		addBinding("@core/KitController/setTickInterval", (tick: unknown) =>
			this.tickInterval(ty.Number.CastOrError(tick)),
		);

		effect(() => {
			if (this.tickOnPreSimulation()) {
				const connection = RunService.PreSimulation.Connect((dt) => this.tick(dt));
				return () => connection.Disconnect();
			}

			let live = true;
			let lastTick = os.clock();
			while (live) this.tick(task.wait(this.tickInterval()));
			return () => (live = false);
		});
	}
}
