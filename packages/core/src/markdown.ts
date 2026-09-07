import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { realPathIsInsideRoot, resolveRegistryPath, toRegistryPath } from "./paths.js";

// A bounded navigation dialect: inline and reference links, outside code.
// This is not a CommonMark renderer or a semantic/heading-anchor validator.
export function localMarkdownTargets(content: string): string[] {
  let fence: { marker: string; length: number } | null = null;
  const prose = content.split(/\r?\n/u).filter((line) => {
    const match = line.match(/^ {0,3}(\x60{3,}|~{3,})(.*)$/u);
    if (match) {
      const marker = match[1]!;
      if (fence === null) {
        fence = { marker: marker[0]!, length: marker.length };
      } else if (marker[0] === fence.marker && marker.length >= fence.length &&
        match[2]!.trim() === "") {
        fence = null;
      }
      return false;
    }
    return fence === null;
  }).join("\n").replace(/(\x60+)[\s\S]*?\1/g, "");
  const raw: string[] = [];
  const definitions = new Map<string, string>();
  const label = (value: string): string => value.trim().replace(/\s+/gu, " ").toLowerCase();
  const text = prose.replace(/^ {0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+).*$/gmu,
    (_match, id: string, target: string) => {
      definitions.set(label(id), target);
      return "";
    });
  const withoutInline = text.replace(/!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/gu,
    (_match, target: string) => { raw.push(target); return ""; });
  withoutInline.replace(/!?\[([^\]]+)\](?:\[([^\]]*)\])?/gu,
    (_match, textLabel: string, reference: string | undefined) => {
      const target = definitions.get(label(reference || textLabel));
      if (target) raw.push(target);
      return "";
    });
  return raw.map((target) => target.startsWith("<") ? target.slice(1, -1) : target)
    .filter((target) => target.length > 0 && !target.startsWith("#") &&
      !target.startsWith("//") && !/^[a-z][a-z\d+.-]*:/iu.test(target));
}

export function markdownTargetPath(markdownPath: string, encodedTarget: string): string {
  let target = encodedTarget.split(/[?#]/u, 1)[0] ?? "";
  try { target = decodeURIComponent(target); } catch { /* Report the literal malformed path. */ }
  target = target.replaceAll("\\", "/");
  return toRegistryPath(target.startsWith("/")
    ? target.slice(1)
    : path.posix.join(path.posix.dirname(markdownPath), target));
}

export async function readContainedText(root: string, relative: string): Promise<string | null> {
  const absolute = resolveRegistryPath(root, relative);
  try {
    if (!(await realPathIsInsideRoot(root, absolute)) || !(await stat(absolute)).isFile()) {
      return null;
    }
    return await readFile(absolute, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
