import { join } from "node:path";

export function isolatedPackageEnvironment(directory, environment) {
  // npm's cache setting does not control pnpm's registry metadata cache.
  // XDG_CACHE_HOME is honoured by the pinned pnpm on macOS and Linux.
  return {
    ...environment,
    NPM_CONFIG_CACHE: join(directory, "npm-cache"),
    XDG_CACHE_HOME: join(directory, "metadata-cache"),
  };
}
