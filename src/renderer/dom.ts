export function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Elemen #${id} tidak ada di index.html`);
  }
  return node as T;
}
