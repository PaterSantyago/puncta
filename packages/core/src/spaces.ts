/** Find only the immediately preceding interval, without searching every
 * starting position in an ever-growing prefix with an end-anchored regexp. */
export function precedingSpaceStart(
  text: string,
  end: number,
  spaces = " ",
): number {
  while (end > 0 && spaces.includes(text[end - 1])) end--;
  return end;
}
