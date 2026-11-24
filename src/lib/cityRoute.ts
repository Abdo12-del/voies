/** Provisional artwork coordinates. Change these once the story locations are
 * decided; the city image is 1584 × 672 and all route positions scale with it. */
const artworkPoints: ReadonlyArray<readonly [number, number]> = [
  [292, 201], [335, 207], [300, 245], [260, 225], [220, 235], [175, 253],
  [135, 278], [125, 320], [140, 360], [165, 395], [205, 415], [250, 438],
  [300, 460], [350, 478], [400, 478], [440, 450],
  [490, 420], [540, 405], [590, 410], [640, 425], [695, 442], [750, 464],
  [805, 490], [860, 515], [915, 538], [970, 548], [1020, 535], [1060, 507],
  [1100, 478], [1140, 450], [1185, 422], [1230, 389],
];
const toPercent = ([x, y]: readonly [number, number]) => [x / 1584 * 100, y / 672 * 100] as const;
export const CITY_ROUTE = artworkPoints.map(toPercent);
export const CITY_MILESTONES = ([[460, 405], [1270, 354]] as const).map(toPercent);
