import type { Assert, MutuallyAssignable } from "./typeChecks";
import { z } from "./zodJitless";

/** Where a deployed file comes from. */
export const FileSourceKind = {
  Nexus: "NEXUS",
  VortexGenerated: "VORTEX_GENERATED",
  UserGenerated: "USER_GENERATED",
} as const;
export type FileSourceKind = (typeof FileSourceKind)[keyof typeof FileSourceKind];

/** A deployed file: its origin and absolute destination. */
export type FileSource =
  | {
      source: typeof FileSourceKind.Nexus;
      fileId: string;
      fileHash: string;
      destinationPath: string;
    }
  | {
      source: typeof FileSourceKind.VortexGenerated;
      fileHash: string;
      destinationPath: string;
      /** base64 of the file's exact bytes */
      content: string;
    }
  | { source: typeof FileSourceKind.UserGenerated; fileHash: string; destinationPath: string };

/** A file Vortex or a game extension writes during a deployment. */
export type GeneratedFileSource = Extract<
  FileSource,
  { source: typeof FileSourceKind.VortexGenerated }
>;

/** Orders lockfile files by destination; destinations are unique. */
export const byDestinationPath = (lhs: FileSource, rhs: FileSource): number =>
  lhs.destinationPath < rhs.destinationPath ? -1 : 1;

/** The resolved files of one game, the Plan step's input. */
export interface Lockfile {
  version: number;
  gameId: string;
  gameVersion: string;
  storeId: string;
  files: FileSource[];
}

const fileSourceSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal(FileSourceKind.Nexus),
    fileId: z.string(),
    fileHash: z.string(),
    destinationPath: z.string(),
  }),
  z.object({
    source: z.literal(FileSourceKind.VortexGenerated),
    fileHash: z.string(),
    destinationPath: z.string(),
    content: z.string(),
  }),
  z.object({
    source: z.literal(FileSourceKind.UserGenerated),
    fileHash: z.string(),
    destinationPath: z.string(),
  }),
]);

const lockfileSchema = z.object({
  version: z.number().int(),
  gameId: z.string(),
  gameVersion: z.string(),
  storeId: z.string(),
  files: z.array(fileSourceSchema),
});

// typecheck fails when the schema and its type drift apart
type _LockfileMatches = Assert<MutuallyAssignable<z.infer<typeof lockfileSchema>, Lockfile>>;

export const LockfileSchema: z.ZodType<Lockfile> = lockfileSchema;
