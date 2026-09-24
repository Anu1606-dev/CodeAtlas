import { readFile } from "node:fs/promises";
import path from "node:path";

export interface GraphEdge {
  from: string;
  to: string;
}

const IMPORT_REGEX =
  /(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?|export\s+(?:[\w*{}\s,]+\s+from\s+)?|require\()\s*['"](\.[^'"]+)['"]/g;
const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const SCANNABLE_EXTENSIONS = new Set(RESOLVABLE_EXTENSIONS);

function resolveImportPath(
  fromFileAbsDir: string,
  specifier: string,
  rootDir: string,
  knownFiles: Set<string>
): string | null {
  const basePath = path.resolve(fromFileAbsDir, specifier);
  const relBase = path.relative(rootDir, basePath).split(path.sep).join("/");

  const candidates = [
    relBase,
    ...RESOLVABLE_EXTENSIONS.map((ext) => relBase + ext),
    ...RESOLVABLE_EXTENSIONS.map((ext) => `${relBase}/index${ext}`),
  ];

  return candidates.find((c) => knownFiles.has(c)) ?? null;
}

export async function buildDependencyGraph(rootDir: string, filePaths: string[]): Promise<GraphEdge[]> {
  const knownFiles = new Set(filePaths);
  const edges: GraphEdge[] = [];

  for (const relPath of filePaths) {
    if (!SCANNABLE_EXTENSIONS.has(path.extname(relPath))) continue;

    const absPath = path.join(rootDir, relPath);
    const content = await readFile(absPath, "utf-8").catch(() => null);
    if (content === null) continue;

    const fromDir = path.dirname(absPath);
    for (const match of content.matchAll(IMPORT_REGEX)) {
      const resolved = resolveImportPath(fromDir, match[1], rootDir, knownFiles);
      if (resolved && resolved !== relPath) edges.push({ from: relPath, to: resolved });
    }
  }

  return edges;
}