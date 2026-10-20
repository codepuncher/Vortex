import * as nodeFs from "node:fs";
import * as path from "node:path";

import { expect } from "vitest";

import { makeDeployedFile } from "../../test-utils/builders";
import { test } from "../../test-utils/deploymentTest";

// Windows file systems fold case themselves; these cover case-sensitive ones
const caseSensitiveTest = test.skipIf(process.platform === "win32");

const listGameDir = (dir: string) =>
  nodeFs
    .readdirSync(dir)
    .filter((name) => !name.includes("folder_managed_by_vortex"))
    .sort();

test("keeps a file a manifest lists twice", async ({ makeDeployment }) => {
  const h = makeDeployment({ files: { "Textures/a.dds": "a" } });
  const first = await h.deploy();

  await h.deploy([...first, ...first]);

  expect(h.deployedFiles()).toEqual(["Textures/a.dds"]);
});

caseSensitiveTest(
  "deploys case variants of a folder from different mods into one folder",
  async ({ makeDeployment }) => {
    const h = makeDeployment({
      files: { "textures/two.dds": "two" },
      otherMods: { Other: { "Textures/one.dds": "one" } },
    });

    const first = await h.deployMod("Other");
    const second = await h.deploy(first);

    expect(listGameDir(h.gameDir)).toEqual(["Textures"]);
    expect(listGameDir(path.join(h.gameDir, "Textures"))).toEqual(["one.dds", "two.dds"]);
    expect(second.find((file) => file.source === "SomeMod")?.deployedRelPath).toBe(
      path.join("Textures", "two.dds"),
    );
  },
);

caseSensitiveTest(
  "removes a file from the folder it was deployed into, not the mod's spelling",
  async ({ makeDeployment }) => {
    const h = makeDeployment({
      files: { "textures/two.dds": "two" },
      otherMods: { Other: { "Textures/one.dds": "one" } },
    });
    const deployed = await h.deploy(await h.deployMod("Other"));

    await h.remove(deployed);

    expect(listGameDir(path.join(h.gameDir, "Textures"))).toEqual(["one.dds"]);
  },
);

caseSensitiveTest(
  "lets the later mod replace a file another mod ships with different case",
  async ({ makeDeployment }) => {
    const h = makeDeployment({
      files: { "Textures/a.dds": "first" },
      otherMods: { Other: { "textures/A.dds": "second" } },
    });

    const deployed = await h.deployMod("Other", await h.deploy());

    expect(listGameDir(h.gameDir)).toEqual(["Textures"]);
    expect(nodeFs.readFileSync(path.join(h.gameDir, "Textures", "a.dds"), "utf8")).toBe("second");
    expect(deployed.map((file) => file.source)).toEqual(["Other"]);
  },
);

caseSensitiveTest(
  "moves an unchanged file out of a case variant folder a case-sensitive deployment created",
  async ({ makeDeployment }) => {
    const h = makeDeployment({
      files: { "Textures/one.dds": "one" },
      otherMods: { Other: { "textures/two.dds": "two" } },
    });
    const first = await h.deploy();
    nodeFs.mkdirSync(path.join(h.gameDir, "textures"));
    nodeFs.linkSync(
      path.join(h.modDir("Other"), "textures", "two.dds"),
      path.join(h.gameDir, "textures", "two.dds"),
    );
    const { mtimeMs } = nodeFs.statSync(path.join(h.modDir("Other"), "textures", "two.dds"));
    const legacy = [
      ...first,
      makeDeployedFile({ relPath: "textures/two.dds", source: "Other", time: mtimeMs }),
    ];

    await h.deployMod("Other", legacy);

    expect(nodeFs.existsSync(path.join(h.gameDir, "textures", "two.dds"))).toBe(false);
    expect(listGameDir(path.join(h.gameDir, "Textures"))).toEqual(["one.dds", "two.dds"]);
  },
);

caseSensitiveTest(
  "removes case variants a case-sensitive deployment left behind",
  async ({ makeDeployment }) => {
    const h = makeDeployment({
      files: { "Textures/a.dds": "first" },
      otherMods: { Other: { "textures/A.dds": "second" } },
    });
    const first = await h.deploy();
    nodeFs.mkdirSync(path.join(h.gameDir, "textures"));
    nodeFs.linkSync(
      path.join(h.modDir("Other"), "textures", "A.dds"),
      path.join(h.gameDir, "textures", "A.dds"),
    );
    const legacy = [...first, makeDeployedFile({ relPath: "textures/A.dds", source: "Other" })];

    await h.deployAll(["SomeMod", "Other"], legacy);

    expect(nodeFs.existsSync(path.join(h.gameDir, "textures", "A.dds"))).toBe(false);
    expect(nodeFs.readFileSync(path.join(h.gameDir, "Textures", "a.dds"), "utf8")).toBe("second");
  },
);

caseSensitiveTest(
  "leaves case variants in place when deploying a single mod",
  async ({ makeDeployment }) => {
    const h = makeDeployment({
      files: { "Textures/a.dds": "first" },
      otherMods: { Other: { "textures/A.dds": "second" }, Third: { "c.esp": "c" } },
    });
    const first = await h.deploy();
    nodeFs.mkdirSync(path.join(h.gameDir, "textures"));
    nodeFs.linkSync(
      path.join(h.modDir("Other"), "textures", "A.dds"),
      path.join(h.gameDir, "textures", "A.dds"),
    );
    const legacy = [...first, makeDeployedFile({ relPath: "textures/A.dds", source: "Other" })];

    const deployed = await h.deployMod("Third", legacy);

    expect(nodeFs.readFileSync(path.join(h.gameDir, "Textures", "a.dds"), "utf8")).toBe("first");
    expect(nodeFs.readFileSync(path.join(h.gameDir, "textures", "A.dds"), "utf8")).toBe("second");
    expect(deployed.map((file) => file.relPath).sort()).toEqual([
      "Textures/a.dds",
      "c.esp",
      "textures/A.dds",
    ]);
  },
);

caseSensitiveTest(
  "backs up a game file a moved mod file now lands on, and restores it",
  async ({ makeDeployment }) => {
    const h = makeDeployment({ files: { "textures/a.dds": "mod" } });
    nodeFs.mkdirSync(path.join(h.gameDir, "Textures"));
    nodeFs.writeFileSync(path.join(h.gameDir, "Textures", "a.dds"), "game");
    nodeFs.mkdirSync(path.join(h.gameDir, "textures"));
    nodeFs.linkSync(
      path.join(h.modDir("SomeMod"), "textures", "a.dds"),
      path.join(h.gameDir, "textures", "a.dds"),
    );

    const deployed = await h.deploy(h.manifest());

    const gameFile = path.join(h.gameDir, "Textures", "a.dds");
    expect(nodeFs.readFileSync(gameFile, "utf8")).toBe("mod");
    expect(nodeFs.readFileSync(gameFile + ".vortex_backup", "utf8")).toBe("game");

    await h.remove(deployed);

    expect(nodeFs.readFileSync(gameFile, "utf8")).toBe("game");
  },
);

caseSensitiveTest(
  "removes a case variant folder Vortex created once its files moved out",
  async ({ makeDeployment }) => {
    const h = makeDeployment({
      files: { "Textures/one.dds": "one" },
      otherMods: { Other: { "textures/two.dds": "two" } },
    });
    const first = await h.deploy();
    nodeFs.mkdirSync(path.join(h.gameDir, "textures"));
    nodeFs.writeFileSync(path.join(h.gameDir, "textures", ".__folder_managed_by_vortex"), "");
    nodeFs.linkSync(
      path.join(h.modDir("Other"), "textures", "two.dds"),
      path.join(h.gameDir, "textures", "two.dds"),
    );
    const legacy = [...first, makeDeployedFile({ relPath: "textures/two.dds", source: "Other" })];

    await h.deployMod("Other", legacy);

    expect(listGameDir(h.gameDir)).toEqual(["Textures"]);
  },
);
