import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export function getDataRoot(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.BARTERCHAIN_DATA_DIR?.trim();
  if (override) {
    return override;
  }

  if (env.VERCEL === "1" || env.VERCEL_ENV) {
    return path.join(os.tmpdir(), "barterchain-data");
  }

  return path.join(process.cwd(), "data");
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function writeJsonFileSafe(
  filePath: string,
  data: unknown
): Promise<{ persisted: boolean; error?: string }> {
  try {
    await writeJsonFile(filePath, data);
    return { persisted: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not write data file.";
    console.error(`[barterchain] persist failed: ${filePath}`, error);
    return { persisted: false, error: message };
  }
}
