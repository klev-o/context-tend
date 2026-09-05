import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export function toRegistryPath(value: string): string {
  const withSlashes = value.replaceAll("\\", "/");
  const hadTrailingSlash = withSlashes.endsWith("/");
  const normalized = path.posix.normalize(withSlashes).replace(/^\.\//, "");
  if (normalized === ".") {
    return "";
  }
  return hadTrailingSlash && !normalized.endsWith("/")
    ? `${normalized}/`
    : normalized;
}

export function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function resolveRegistryPath(root: string, registryPath: string): string {
  if (path.isAbsolute(registryPath) || /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(registryPath)) {
    throw new Error(`Registry path must be relative: ${registryPath}`);
  }
  const normalized = toRegistryPath(registryPath);
  const resolved = path.resolve(root, ...normalized.split("/").filter(Boolean));
  if (!isPathInside(root, resolved)) {
    throw new Error(`Registry path escapes the project root: ${registryPath}`);
  }
  return resolved;
}

export function relativeRegistryPath(root: string, absolutePath: string): string {
  if (!isPathInside(root, absolutePath)) {
    throw new Error(`Path is outside the project root: ${absolutePath}`);
  }
  return toRegistryPath(path.relative(root, absolutePath));
}

async function nearestExistingAncestor(target: string): Promise<string> {
  let current = target;
  while (true) {
    try {
      await lstat(current);
      return current;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw new Error(`No existing ancestor for ${target}`);
      current = parent;
    }
  }
}

export async function assertSafeProjectWritePath(
  root: string,
  registryPath: string,
): Promise<string> {
  const destination = resolveRegistryPath(root, registryPath);
  const realRoot = await realpath(path.resolve(root));
  try {
    const destinationStats = await lstat(destination);
    if (destinationStats.isSymbolicLink()) {
      throw new Error(`Refusing to write through a symbolic link: ${registryPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const existingAncestor = await nearestExistingAncestor(destination);
  const realAncestor = await realpath(existingAncestor);
  if (!isPathInside(realRoot, realAncestor)) {
    throw new Error(`Write path resolves outside the project root: ${registryPath}`);
  }
  return destination;
}

export async function realPathIsInsideRoot(
  root: string,
  candidate: string,
): Promise<boolean> {
  const [realRoot, realCandidate] = await Promise.all([
    realpath(path.resolve(root)),
    realpath(candidate),
  ]);
  return isPathInside(realRoot, realCandidate);
}
