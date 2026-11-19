import chokidar, { type FSWatcher } from "chokidar";

let watcher: FSWatcher | null = null;

export function watchDeck(filePath: string, onChange: () => void): void {
  void stopWatching();

  watcher = chokidar.watch(filePath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher.on("change", onChange);
  watcher.on("add", onChange);
  watcher.on("unlink", () => {});
  watcher.on("error", (err) => {
    console.warn("[cue] Watcher error:", err);
  });
}

export async function stopWatching(): Promise<void> {
  const current = watcher;
  watcher = null;
  if (current) await current.close();
}
