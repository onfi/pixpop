declare module "node:fs/promises" {
  export function readFile(path: string): Promise<Uint8Array>;
}

declare module "node:path" {
  const path: {
    resolve(...paths: string[]): string;
  };

  export default path;
}
