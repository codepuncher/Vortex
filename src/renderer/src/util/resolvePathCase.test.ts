import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type DirEntryCache, resolvePathCase } from "./resolvePathCase";

describe("resolvePathCase", () => {
  let base: string;

  beforeAll(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-case-"));
    fs.mkdirSync(path.join(base, "SKSE", "Plugins"), { recursive: true });
    fs.writeFileSync(path.join(base, "SKSE", "Plugins", "LumaUtil.dll"), "");
  });

  afterAll(() => {
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("keeps a path that already matches", async () => {
    expect(await resolvePathCase(base, "SKSE/Plugins/LumaUtil.dll")).toBe(
      path.join("SKSE", "Plugins", "LumaUtil.dll"),
    );
  });

  it("adopts the on-disk spelling of case variants", async () => {
    expect(await resolvePathCase(base, "skse/plugins/lumautil.dll")).toBe(
      path.join("SKSE", "Plugins", "LumaUtil.dll"),
    );
  });

  it("keeps the given spelling below the first missing component", async () => {
    expect(await resolvePathCase(base, "skse/plugins/New/File.ini")).toBe(
      path.join("SKSE", "Plugins", "New", "File.ini"),
    );
  });

  it.skipIf(process.platform === "win32")(
    "resolves every spelling to one of several existing case variants",
    async () => {
      fs.mkdirSync(path.join(base, "Meshes"));
      fs.mkdirSync(path.join(base, "meshes"));
      expect(await resolvePathCase(base, "meshes/a.nif")).toBe(path.join("Meshes", "a.nif"));
      expect(await resolvePathCase(base, "MESHES/a.nif")).toBe(path.join("Meshes", "a.nif"));
    },
  );

  it("resolves later paths to a spelling claimed earlier in the same cache", async () => {
    const cache: DirEntryCache = new Map();
    await resolvePathCase(base, "Interface/SkyUI/buttonart.swf", cache);
    expect(await resolvePathCase(base, "interface/skyui/icons.swf", cache)).toBe(
      path.join("Interface", "SkyUI", "icons.swf"),
    );
    expect(fs.existsSync(path.join(base, "Interface"))).toBe(false);
  });
});
