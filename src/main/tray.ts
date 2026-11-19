import { Menu, Tray, nativeImage } from "electron";

const ICON_VISIBLE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKUlEQVR42mNgoAaw2PvjPzkYxQB+cS2S8HA2gFDAjYbB8A4DijITJQAAqhVuQGda8UcAAAAASUVORK5CYII=";

const ICON_HIDDEN =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJUlEQVR42mNgoAb4vV/lPzkYxQB+cS2S8KgBowYMVwMoykyUAACdclFkjIJ01gAAAABJRU5ErkJggg==";

let tray: Tray | null = null;

interface TrayActions {
  onToggleHidden(): void;
  onQuit(): void;
}

export function createTray(actions: TrayActions): void {
  tray = new Tray(nativeImage.createFromDataURL(ICON_VISIBLE));
  tray.setToolTip("Cue");

  tray.on("click", () => actions.onToggleHidden());

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Tampilkan / sembunyikan",
        click: () => actions.onToggleHidden(),
      },
      { type: "separator" },
      { label: "Keluar", click: () => actions.onQuit() },
    ]),
  );
}

export function updateTray(hidden: boolean, sessionActive: boolean): void {
  if (!tray || tray.isDestroyed()) return;

  tray.setImage(
    nativeImage.createFromDataURL(hidden ? ICON_HIDDEN : ICON_VISIBLE),
  );

  const parts = ["Cue"];
  parts.push(hidden ? "tersembunyi" : "tampil");
  if (sessionActive) parts.push("SESI AKTIF");
  tray.setToolTip(parts.join(" — "));
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
