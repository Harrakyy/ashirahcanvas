export interface PrintArea {
  x: number
  y: number
  width: number
  height: number
}

// Key format: `${category}-${colorName}-${view}`
// Canvas size: 500 x 650
export const PRINT_AREAS: Record<string, PrintArea> = {
  'tshirt-white-front': { x: 125, y: 175, width: 250, height: 300 },
}

const HEX_TO_COLOR_NAME: Record<string, string> = {
  '#FFFFFF': 'white',
}

const CATEGORY_NORMALIZE: Record<string, string> = {
  tshirts: 'tshirt',
  jackets: 'jacket',
  polo: 'polo',
  sport: 'sport',
}

export function getPrintAreaKey(category: string, colorHex: string, view: string): string | null {
  const colorName = HEX_TO_COLOR_NAME[colorHex]
  if (!colorName) return null
  const normalized = CATEGORY_NORMALIZE[category] ?? category
  return `${normalized}-${colorName}-${view}`
}

export function getPrintArea(category: string, colorHex: string, view: string): PrintArea | null {
  const key = getPrintAreaKey(category, colorHex, view)
  if (!key) return null
  return PRINT_AREAS[key] ?? null
}
