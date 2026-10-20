import { FileSourceKind, type GeneratedFileSource } from "./lockfile";

/** A file a module or game extension writes during a deployment. */
export interface IGeneratedFile {
  /** absolute */
  destinationPath: string;
  /** the exact bytes the deployment leaves there */
  content: Uint8Array;
}

/** Whether a contribution handles a game, by Vortex's game id. */
export type LockfileContributionCondition<TState> = (state: TState, gameMode: string) => boolean;

/** Declares the files a module or game extension generates for a game's deployment. */
export type LockfileContribution<TState> = (
  state: TState,
  gameMode: string,
  profileId: string,
) => Promise<IGeneratedFile[]>;

export interface ILockfileContributionsOptions {
  /** hashes a generated file's bytes the way staged files are hashed */
  hashContent: (content: Buffer) => string;
  /** a contribution failed; its files are left out */
  onFailure: (contributor: string, gameMode: string, err: unknown) => void;
}

interface IRegisteredContribution<TState> {
  /** the extension or module that registered it */
  contributor: string;
  condition: LockfileContributionCondition<TState>;
  generate: LockfileContribution<TState>;
}

/** The registered contributions and the generated files they declare. */
export class LockfileContributions<TState> {
  #contributions: IRegisteredContribution<TState>[] = [];
  #options: ILockfileContributionsOptions;

  constructor(options: ILockfileContributionsOptions) {
    this.#options = options;
  }

  public register(
    contributor: string,
    condition: LockfileContributionCondition<TState>,
    generate: LockfileContribution<TState>,
  ): void {
    this.#contributions.push({ contributor, condition, generate });
  }

  /** Files the game's contributions declare; a failing one is skipped, a shared path rejects. */
  public async generatedFiles(
    state: TState,
    gameMode: string,
    profileId: string,
  ): Promise<GeneratedFileSource[]> {
    const declared = await Promise.all(
      this.#contributions.map(async ({ contributor, condition, generate }) => {
        try {
          const files = condition(state, gameMode)
            ? await generate(state, gameMode, profileId)
            : [];
          return { contributor, files };
        } catch (err) {
          this.#options.onFailure(contributor, gameMode, err);
          return { contributor, files: [] };
        }
      }),
    );
    // keyed by destination path
    const contributorByDestination = new Map<string, string>();
    return declared.flatMap(({ contributor, files }) =>
      files.map(({ destinationPath, content }) => {
        const portablePath = destinationPath.replaceAll("\\", "/");
        const declaredBy = contributorByDestination.get(portablePath);
        if (declaredBy !== undefined) {
          throw new Error(`${portablePath} is declared by both ${declaredBy} and ${contributor}`);
        }
        contributorByDestination.set(portablePath, contributor);
        const bytes = Buffer.from(content);
        return {
          source: FileSourceKind.VortexGenerated,
          destinationPath: portablePath,
          fileHash: this.#options.hashContent(bytes),
          content: bytes.toString("base64"),
        };
      }),
    );
  }
}
