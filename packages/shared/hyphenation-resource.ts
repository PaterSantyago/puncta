/** Private immutable data protocol shared by separately packaged locales/core. */
export function freezeResource<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeResource(child);
    Object.freeze(value);
  }
  return value;
}
