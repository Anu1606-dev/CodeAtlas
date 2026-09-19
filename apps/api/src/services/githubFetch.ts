import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";

export interface FetchedRepo {
  rootDir: string;
  cleanup: () => Promise<void>;
}

export async function fetchRepoSnapshot(
  owner: string,
  repo: string,
  ref: string,
  accessToken: string
): Promise<FetchedRepo> {
  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`;

  const res = await fetch(tarballUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to download tarball for ${owner}/${repo}: ${res.status}`);
  }

  const extractDir = await mkdtemp(path.join(tmpdir(), "codeatlas-"));

  // Node's fetch() returns a Web Streams ReadableStream; tar's extract()
  // expects a Node stream, so we bridge the two here.
  await pipeline(Readable.fromWeb(res.body as never), tar.extract({ cwd: extractDir }));

  // GitHub tarballs always contain exactly one top-level folder,
  // named like "owner-repo-<shortsha>" — step into it.
  const entries = await readdir(extractDir);
  const rootDir = entries.length === 1 ? path.join(extractDir, entries[0]) : extractDir;

  return {
    rootDir,
    cleanup: () => rm(extractDir, { recursive: true, force: true }),
  };
}