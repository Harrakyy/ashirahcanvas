const HEX_TO_COLOR_NAME: Record<string, string> = {
  '#FFFFFF': 'white',
}

const CATEGORY_NORMALIZE: Record<string, string> = {
  tshirts: 'tshirt',
  jackets: 'jacket',
  polo: 'polo',
  sport: 'sport',
}

export function getMockupUrl(
  category: string,
  colorHex: string,
  view: string
): string | null {
  const colorName = HEX_TO_COLOR_NAME[colorHex]
  if (!colorName) return null

  const dirCategory = CATEGORY_NORMALIZE[category] ?? category

  return `/mockups/${dirCategory}/${colorName}/${view}.png`
}
