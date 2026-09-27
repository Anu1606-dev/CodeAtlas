import { describe, it, expect } from "vitest";
import path from "node:path";
import { resolveImportPath } from "./depGraph.js";

describe("resolveImportPath", () => {
  const rootDir = path.resolve("/repo");
  const knownFiles = new Set(["src/app.js", "src/routes/user.js", "src/utils/db.js", "src/utils/index.js"]);
  const fromDir = path.join(rootDir, "src");

  it("resolves a relative import that already has an extension", () => {
    expect(resolveImportPath(fromDir, "./routes/user.js", rootDir, knownFiles)).toBe("src/routes/user.js");
  });

  it("resolves a relative import missing its extension", () => {
    expect(resolveImportPath(fromDir, "./routes/user", rootDir, knownFiles)).toBe("src/routes/user.js");
  });

  it("resolves a directory import to its index file", () => {
    expect(resolveImportPath(fromDir, "./utils", rootDir, knownFiles)).toBe("src/utils/index.js");
  });

  it("returns null for a specifier matching no known file", () => {
    expect(resolveImportPath(fromDir, "./does-not-exist", rootDir, knownFiles)).toBeNull();
  });
});