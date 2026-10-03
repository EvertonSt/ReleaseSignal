/**
 * Repeatable element picker for generated demo data.
 *
 * The fixtures below need `list[i % list.length]`, but that expression is
 * typed `T | undefined` under `noUncheckedIndexedAccess`, and reaching for a
 * non-null assertion sixty times would be worse than saying what is actually
 * true: the list is a literal, non-empty constant.
 */
export function cycle<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error("cycle() needs a non-empty list");
  }
  return item;
}
