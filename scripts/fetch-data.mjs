#!/usr/bin/env node
// Fetch the dashboard's refreshed data files into the working tree.
//
// The nightly refresh stores its output on the `data` branch (one commit, replaced
// each run) instead of committing it to master. master carries a small pointer,
// data/data-ref.json, naming the exact data commit and every file's git blob hash.
// This script makes the working tree match that pointer, so a build of any master
// commit gets exactly the data that was live for it.
//
// Usage:
//   node scripts/fetch-data.mjs              match data/data-ref.json (build, local dev)
//   node scripts/fetch-data.mjs --ref data   match the head of a data branch instead
//                                            (the refresh job uses this; also works with
//                                            data-yesterday, data-last-week, data-last-month;
//                                            needs a git clone)
//   node scripts/fetch-data.mjs --check      report only; exit 1 if anything is missing
//
// Two transports, chosen automatically:
//   git  (local clone, GitHub Actions) - `git fetch` from the remote
//   raw  (Vercel, where there is no .git) - https://raw.githubusercontent.com/<repo>/<commit>/<path>
//        The repo is public, so no token is needed, and raw.githubusercontent.com is not
//        subject to the 60-requests-per-hour limit of the unauthenticated REST API.
//
// Every file is verified against its git blob hash before it is written, and files
// that already match are skipped, so re-running is cheap.
//
// Env: DATA_FETCH_MODE=git|raw, DATA_REMOTE (default origin), DATA_REPO (owner/name),
//      DATA_RAW_BASE (tests only), DATA_STRICT=1 (never fall back to the data branch
//      head; always on in Vercel production).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REF_FILE = path.join(ROOT, "data", "data-ref.json");
const REMOTE = process.env.DATA_REMOTE || "origin";
const BRANCH = "data";

const argv = process.argv.slice(2);
const opts = { ref: null, check: false };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--ref") opts.ref = argv[++i];
  else if (argv[i] === "--check") opts.check = true;
  else {
    console.error(`[fetch-data] unknown argument: ${argv[i]}`);
    process.exit(2);
  }
}

const onVercel = Boolean(process.env.VERCEL);
const strict = process.env.DATA_STRICT === "1" || process.env.VERCEL_ENV === "production";

function hasGitRepo() {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const mode = process.env.DATA_FETCH_MODE || (onVercel || !hasGitRepo() ? "raw" : "git");

const log = (msg) => console.log(`[fetch-data] ${msg}`);

function blobSha(buf) {
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

// Only data/ paths are ever written; the data branch also holds a README and a
// vercel.json (which stops Vercel building the data branch) that must not land here.
function dataOnly(files) {
  return Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith("data/") && !p.includes("..")));
}

function stale(files) {
  return Object.entries(files).filter(([rel, sha]) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return true;
    return blobSha(fs.readFileSync(abs)) !== sha;
  });
}

// ---------------------------------------------------------------- git transport
function git(args, opt = {}) {
  return execFileSync("git", args, { cwd: ROOT, maxBuffer: 1 << 30, ...opt });
}
function gitHas(obj) {
  try {
    git(["cat-file", "-e", obj], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function lsTree(commit) {
  const out = git(["ls-tree", "-r", "-z", commit]).toString();
  const files = {};
  for (const entry of out.split("\0")) {
    if (!entry) continue;
    const [meta, p] = entry.split("\t");
    const [, type, sha] = meta.split(" ");
    if (type === "blob") files[p] = sha;
  }
  return files;
}
const gitTransport = {
  async treeOf(ref) {
    git(["fetch", "--no-tags", "--depth=1", REMOTE, `refs/heads/${ref}`], { stdio: ["ignore", "ignore", "inherit"] });
    const commit = git(["rev-parse", "FETCH_HEAD^{commit}"]).toString().trim();
    return { commit, files: lsTree(commit) };
  },
  async prepare(commit) {
    if (commit && !gitHas(`${commit}^{commit}`)) {
      git(["fetch", "--no-tags", "--depth=1", REMOTE, commit], { stdio: ["ignore", "ignore", "inherit"] });
    }
  },
  async file(_commit, _rel, sha) {
    return git(["cat-file", "blob", sha]);
  },
};

// ---------------------------------------------------------------- raw transport
function repoName() {
  return (
    process.env.DATA_REPO ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : "AH-Datalytics/youth-safety-dashboard")
  );
}
const rawTransport = {
  async treeOf() {
    throw new Error("--ref needs a git clone (raw transport cannot list a branch)");
  },
  async prepare() {},
  async file(commit, rel) {
    const base = (process.env.DATA_RAW_BASE || "https://raw.githubusercontent.com").replace(/\/$/, "");
    const url = `${base}/${repoName()}/${commit}/${rel.split("/").map(encodeURIComponent).join("/")}`;
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(url, { headers: { "User-Agent": "ysd-fetch-data" } });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if ((res.status >= 500 || res.status === 429) && attempt < 4) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      throw new Error(`HTTP ${res.status} for ${rel} at ${commit.slice(0, 7)}`);
    }
  },
};

// ---------------------------------------------------------------- main
// verify: "hash" checks the git blob hash (pinned data); "gzip" only checks that the
// file is a complete gzip stream (fallback to a branch head, whose hashes are unknown).
async function download(transport, commit, todo, verify) {
  const queue = [...todo];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [rel, sha] = item;
      const buf = await transport.file(commit, rel, sha);
      if (verify === "hash" && blobSha(buf) !== sha) throw new Error(`hash mismatch for ${rel}`);
      if (verify === "gzip" && rel.endsWith(".gz")) zlib.gunzipSync(buf);
      const abs = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const tmp = `${abs}.fetch-tmp`;
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, abs);
      log(`wrote ${rel} (${(buf.length / 1048576).toFixed(2)} MB)`);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
}

async function sync(transport, commit, files, label, verify = "hash") {
  const todo = verify === "hash" ? stale(files) : Object.entries(files);
  if (todo.length === 0) {
    log(`data matches ${label} (${Object.keys(files).length} files, ${commit.slice(0, 7)})`);
    return;
  }
  if (opts.check) {
    for (const [rel] of todo) console.error(`[fetch-data] out of date: ${rel}`);
    process.exit(1);
  }
  log(`${todo.length} of ${Object.keys(files).length} files to fetch from ${label} via ${mode}`);
  await transport.prepare(commit);
  await download(transport, commit, todo, verify);
}

async function main() {
  const transport = mode === "raw" ? rawTransport : gitTransport;

  if (opts.ref) {
    const { commit, files } = await transport.treeOf(opts.ref);
    await sync(transport, commit, dataOnly(files), `branch ${opts.ref}`);
    return;
  }

  if (!fs.existsSync(REF_FILE)) {
    throw new Error("data/data-ref.json not found. It is written by scripts/data-branch.sh (bootstrap/publish).");
  }
  const pin = JSON.parse(fs.readFileSync(REF_FILE, "utf8"));
  try {
    await sync(transport, pin.commit, dataOnly(pin.files), `data-ref ${pin.created ?? ""}`.trim());
  } catch (err) {
    // A pinned snapshot older than the oldest restore point (~2 months) can be
    // garbage-collected by GitHub. Production builds must fail rather than silently
    // ship different data (the previous deployment stays live). Preview builds and
    // local dev fall back to the current data branch.
    if (strict || opts.check) throw err;
    console.warn(`[fetch-data] WARNING: pinned data unavailable (${err.message}); using current '${BRANCH}' branch instead`);
    if (mode === "git") {
      const { commit, files } = await transport.treeOf(BRANCH);
      await sync(transport, commit, dataOnly(files), `branch ${BRANCH}`);
    } else {
      await sync(transport, BRANCH, dataOnly(pin.files), `branch ${BRANCH}`, "gzip");
    }
  }
}

main().catch((err) => {
  console.error(`[fetch-data] FAILED: ${err.message}`);
  process.exit(1);
});
