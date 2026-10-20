import { expect, test, vi } from "vitest";

import {
  LockfileContributions,
  type ILockfileContributionsOptions,
  type LockfileContribution,
} from "./contributions";
import { makeDeclaredFile, makeGeneratedFile } from "./testBuilders";

const state = { persistent: {} };
const always = () => true;

function makeContributions(onFailure = vi.fn<ILockfileContributionsOptions["onFailure"]>()) {
  return new LockfileContributions<typeof state>({
    hashContent: () => "plugins-txt-hash",
    onFailure,
  });
}

test("a contributed file comes back with its hash, its content as base64 and / separators", async () => {
  const expected = makeGeneratedFile({
    destinationPath: "C:/AppData/Skyrim Special Edition/plugins.txt",
  });
  const contributions = makeContributions();
  contributions.register("plugin-lists", always, () =>
    Promise.resolve([
      {
        ...makeDeclaredFile(expected),
        destinationPath: "C:\\AppData\\Skyrim Special Edition\\plugins.txt",
      },
    ]),
  );

  expect(await contributions.generatedFiles(state, "skyrimse", "profile-1")).toEqual([expected]);
});

test("a contribution that fails is reported with its contributor and leaves the others' files in", async () => {
  const failure = new Error("unreadable");
  const onFailure = vi.fn<ILockfileContributionsOptions["onFailure"]>();
  const contributions = makeContributions(onFailure);
  contributions.register("broken-extension", always, () => Promise.reject(failure));
  contributions.register("plugin-lists", always, () => Promise.resolve([makeDeclaredFile()]));

  expect(await contributions.generatedFiles(state, "skyrimse", "profile-1")).toEqual([
    makeGeneratedFile(),
  ]);
  expect(onFailure).toHaveBeenCalledWith("broken-extension", "skyrimse", failure);
});

test("a contribution is asked for the game and profile being resolved", async () => {
  const generate = vi.fn<LockfileContribution<typeof state>>(() => Promise.resolve([]));
  const contributions = makeContributions();
  contributions.register("plugin-lists", always, generate);

  await contributions.generatedFiles(state, "skyrimse", "profile-1");

  expect(generate).toHaveBeenCalledWith(state, "skyrimse", "profile-1");
});

test("a contribution whose condition does not match the game is not asked", async () => {
  const generate = vi.fn<LockfileContribution<typeof state>>(() =>
    Promise.resolve([makeDeclaredFile()]),
  );
  const contributions = makeContributions();
  contributions.register("plugin-lists", (_state, gameMode) => gameMode === "fallout4", generate);

  expect(await contributions.generatedFiles(state, "skyrimse", "profile-1")).toEqual([]);
  expect(generate).not.toHaveBeenCalled();
});

test("a condition that throws is reported like a failing contribution", async () => {
  const failure = new Error("no game support");
  const onFailure = vi.fn<ILockfileContributionsOptions["onFailure"]>();
  const generate = vi.fn<LockfileContribution<typeof state>>(() =>
    Promise.resolve([makeDeclaredFile()]),
  );
  const contributions = makeContributions(onFailure);
  contributions.register(
    "broken-extension",
    () => {
      throw failure;
    },
    generate,
  );

  expect(await contributions.generatedFiles(state, "skyrimse", "profile-1")).toEqual([]);
  expect(onFailure).toHaveBeenCalledWith("broken-extension", "skyrimse", failure);
  expect(generate).not.toHaveBeenCalled();
});

test("a path two contributors declare is rejected, naming both of them", async () => {
  const contributions = makeContributions();
  contributions.register("plugin-lists", always, () => Promise.resolve([makeDeclaredFile()]));
  contributions.register("game-extension", always, () => Promise.resolve([makeDeclaredFile()]));

  await expect(contributions.generatedFiles(state, "skyrimse", "profile-1")).rejects.toThrow(
    "declared by both plugin-lists and game-extension",
  );
});
