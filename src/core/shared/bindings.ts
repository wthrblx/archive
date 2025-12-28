import { createLogger } from "core/shared/logger";

const logger = createLogger("bindings");

const bindings = new Map<unknown, (...args: unknown[]) => unknown>();

export function addBinding(key: unknown, callback: (...args: unknown[]) => unknown) {
	logger.trace(`Adding binding: ${key}`);
	bindings.set(key, callback);
}

export function callBinding(key: unknown, ...args: unknown[]) {
	logger.trace(`Calling binding: ${key}`);
	const callback = bindings.get(key);
	if (callback) return callback(...args);
	return undefined;
}
