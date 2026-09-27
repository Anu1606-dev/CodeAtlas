import { describe, it, expect } from "vitest";
import { chunkJsTsFile, isLowValueChunk } from "./chunker.js";

describe("chunkJsTsFile", () => {
  it("captures a simple function declaration as one chunk with the correct symbol name", () => {
    const content = ["import { useState } from 'react';", "", "function App() {", "  return null;", "}"].join("\n");
    const chunks = chunkJsTsFile(content);
    const appChunk = chunks.find((c) => c.symbolName === "App");
    expect(appChunk).toBeDefined();
    expect(appChunk!.content).toContain("function App()");
  });

  it("captures a createSlice-style factory call with nested braces as one chunk (regression: chatSlice bug)", () => {
    const content = [
      "const chatSlice = createSlice({",
      "  name: 'chat',",
      "  reducers: {",
      "    setActiveChatUserId: (state, action) => {",
      "      state.activeChatUserId = action.payload;",
      "    },",
      "  },",
      "});",
      "",
      "export default chatSlice.reducer;",
    ].join("\n");
    const chunks = chunkJsTsFile(content);
    const sliceChunk = chunks.find((c) => c.symbolName === "chatSlice");
    expect(sliceChunk).toBeDefined();
    expect(sliceChunk!.content).toContain("setActiveChatUserId");
    expect(sliceChunk!.content.trim().endsWith("});")).toBe(true);
  });

  it("does not merge two separate top-level declarations into one chunk", () => {
    const content = ["function first() {", "  return 1;", "}", "", "function second() {", "  return 2;", "}"].join("\n");
    const chunks = chunkJsTsFile(content);
    const firstChunk = chunks.find((c) => c.symbolName === "first");
    expect(firstChunk).toBeDefined();
    expect(firstChunk!.content).not.toContain("second");
  });
});

describe("isLowValueChunk", () => {
  it("flags a chunk of only import statements as low value", () => {
    expect(isLowValueChunk("import { useState } from 'react';\nimport axios from 'axios';")).toBe(true);
  });

  it("flags a bare export-default line as low value", () => {
    expect(isLowValueChunk("export default Login;")).toBe(true);
  });

  it("does not flag a chunk containing real logic", () => {
    expect(isLowValueChunk("function add(a, b) {\n  return a + b;\n}")).toBe(false);
  });
});