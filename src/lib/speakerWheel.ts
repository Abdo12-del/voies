/** Rejection sampling avoids giving some names a larger chance through modulo bias. */
export function randomIndex(
  length: number,
  next = () => crypto.getRandomValues(new Uint32Array(1))[0],
): number {
  if (!Number.isInteger(length) || length < 1 || length > 0xffffffff)
    throw new RangeError("A non-empty list is required.");
  const limit = Math.floor(0x100000000 / length) * length;
  let value: number;
  do {
    value = next();
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff)
      throw new RangeError("Invalid random sample.");
  } while (value >= limit);
  return value % length;
}

/** Sectors begin at twelve o'clock. Land their centre exactly under the fixed pointer. */
export function nextRotation(
  previous: number,
  index: number,
  count: number,
): number {
  if (
    !Number.isFinite(previous) ||
    previous < 0 ||
    !Number.isInteger(count) ||
    count < 1 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= count
  )
    throw new RangeError("Invalid wheel geometry.");
  const target = (360 - ((index + 0.5) * 360) / count) % 360;
  return previous + 5 * 360 + ((target - (previous % 360) + 360) % 360);
}
export function sectorPath(index: number, count: number): string {
  const angle = (Math.PI * 2) / count;
  const start = -Math.PI / 2 + index * angle;
  const end = start + angle;
  const point = (a: number) =>
    `${(180 + 170 * Math.cos(a)).toFixed(3)} ${(180 + 170 * Math.sin(a)).toFixed(3)}`;
  if (count === 1) return "M180 10a170 170 0 1 1 0 340a170 170 0 1 1 0-340Z";
  return `M180 180L${point(start)}A170 170 0 ${angle > Math.PI ? 1 : 0} 1 ${point(end)}Z`;
}
