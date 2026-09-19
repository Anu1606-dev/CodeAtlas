import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface CodeChunkResult {
    filePath: string;
    language: string;
    startLine: number;
    endLine: number;
    content: string;
    symbolName?: string;
}

const IGNORED_DIRS = new Set([
    "node_modules", "dist", "build", "out", ".next", ".cache",
    "coverage", "vendor", "target", "venv", "__pycache__", ".turbo",
]);

const IGNORED_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);

const CODE_EXTENSIONS = new Set([
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".py", ".go", ".java", ".kt", ".rb", ".php",
    ".c", ".h", ".cpp", ".hpp", ".cs", ".rs", ".swift",
    ".md", ".json", ".yml", ".yaml", ".html", ".css", ".scss", ".sql", ".sh",
]);

const JS_TS_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const MAX_FILE_SIZE_BYTES = 300 * 1024;

async function listSourceFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        // Skip all dotfiles/dotdirs outright — this is deliberate: it keeps
        // .env, .git, and similar out of scope without a separate secrets check.
        if (entry.name.startsWith(".")) continue;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            if (IGNORED_DIRS.has(entry.name)) continue;
            files.push(...(await listSourceFiles(rootDir, fullPath)));
            continue;
        }

        if (IGNORED_FILES.has(entry.name)) continue;
        if (!CODE_EXTENSIONS.has(path.extname(entry.name))) continue;

        const stats = await stat(fullPath);
        if (stats.size > MAX_FILE_SIZE_BYTES) continue;

        files.push(fullPath);
    }

    return files;
}

function languageFromExtension(ext: string): string {
    const map: Record<string, string> = {
        ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
        ".ts": "typescript", ".tsx": "typescript",
        ".py": "python", ".go": "go", ".java": "java", ".kt": "kotlin",
        ".rb": "ruby", ".php": "php", ".c": "c", ".h": "c", ".cpp": "cpp", ".hpp": "cpp",
        ".cs": "csharp", ".rs": "rust", ".swift": "swift",
        ".md": "markdown", ".json": "json", ".yml": "yaml", ".yaml": "yaml",
        ".html": "html", ".css": "css", ".scss": "scss", ".sql": "sql", ".sh": "shell",
    };
    return map[ext] ?? "text";
}

interface RawChunk {
    startLine: number;
    endLine: number;
    content: string;
    symbolName?: string;
}

const TOP_LEVEL_BOUNDARY =
    /^(export\s+)?(default\s+)?(async\s+)?(function\b|class\b|interface\b|type\s+\w+\s*=|(const|let|var)\s+\w+\s*=\s*(async\s*)?[\w.]*\s*\()/;

function chunkJsTsFile(content: string): RawChunk[] {
    const lines = content.split("\n");
    const chunks: RawChunk[] = [];
    let i = 0;
    let miscStart = 0;
    let miscLines: string[] = [];

    function flushMisc(endLine: number) {
        if (miscLines.length === 0) return;
        chunks.push({ startLine: miscStart + 1, endLine, content: miscLines.join("\n") });
        miscLines = [];
    }

    while (i < lines.length) {
        const line = lines[i];

        if (!/^\s/.test(line) && TOP_LEVEL_BOUNDARY.test(line)) {
            flushMisc(i);

            const startLine = i;
            const symbolMatch = line.match(/\b(function|class|interface|type|const|let|var)\s+(\w+)/);
            const symbolName = symbolMatch?.[2];

            let depth = 0;
            let opened = false;
            let end = i;

            for (; end < lines.length; end++) {
                for (const ch of lines[end]) {
                    if (ch === "{") { depth++; opened = true; }
                    if (ch === "}") depth--;
                }
                if (opened && depth <= 0) break;
                if (!opened && /;\s*$/.test(lines[end])) break;
                if (end - startLine > 400) break; // safety valve against runaway matches
            }

            chunks.push({
                startLine: startLine + 1,
                endLine: end + 1,
                content: lines.slice(startLine, end + 1).join("\n"),
                symbolName,
            });

            i = end + 1;
            miscStart = i;
            continue;
        }

        miscLines.push(line);
        if (miscLines.length >= 60) {
            flushMisc(i + 1);
            miscStart = i + 1;
        }
        i++;
    }

    flushMisc(lines.length);
    return chunks.filter((c) => c.content.trim().length > 0);
}

function chunkGenericFile(content: string): RawChunk[] {
    const lines = content.split("\n");
    const CHUNK_SIZE = 100;
    const OVERLAP = 15;
    const chunks: RawChunk[] = [];

    for (let start = 0; start < lines.length; start += CHUNK_SIZE - OVERLAP) {
        const end = Math.min(start + CHUNK_SIZE, lines.length);
        chunks.push({ startLine: start + 1, endLine: end, content: lines.slice(start, end).join("\n") });
        if (end >= lines.length) break;
    }

    return chunks.filter((c) => c.content.trim().length > 0);
}

export async function chunkRepo(rootDir: string): Promise<CodeChunkResult[]> {
    const filePaths = await listSourceFiles(rootDir);
    const chunks: CodeChunkResult[] = [];

    for (const absPath of filePaths) {
        const relPath = path.relative(rootDir, absPath).split(path.sep).join("/");
        const content = await readFile(absPath, "utf-8").catch(() => null);
        if (content === null) continue;

        const ext = path.extname(absPath);
        const rawChunks = JS_TS_EXTENSIONS.has(ext) ? chunkJsTsFile(content) : chunkGenericFile(content);

        for (const c of rawChunks) {
            chunks.push({ ...c, filePath: relPath, language: languageFromExtension(ext) });
        }
    }

    return chunks;
}