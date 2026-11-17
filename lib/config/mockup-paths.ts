import type { ProductColorVariant } from '@/lib/db/schema'

export type { ProductColorVariant }

let activeCustomVariants: ProductColorVariant[] = []

export function setActiveColorVariants(variants: ProductColorVariant[]) {
  activeCustomVariants = Array.isArray(variants) ? variants : []
}

export function getActiveColorVariants(): ProductColorVariant[] {
  return activeCustomVariants
}

const HEX_TO_COLOR_NAME: Record<string, string> = {
  '#FFFFFF': 'white',
  '#000000': 'black',
}

const CATEGORY_NORMALIZE: Record<string, string> = {
  tshirts: 'tshirt',
  jackets: 'jacket',
  polo: 'polo',
  sport: 'sport',
}

export function getColorName(colorHex: string): string {
  if (!colorHex) return 'Pilih Warna'
  const normalizedHex = colorHex.trim().toUpperCase()
  const customVariant = activeCustomVariants.find(
    v => v.hex?.trim().toUpperCase() === normalizedHex
  )
  if (customVariant?.name) {
    return customVariant.name
  }

  const defaultNames: Record<string, string> = {
    '#FFFFFF': 'Putih',
    '#000000': 'Hitam',
    '#1E3A8A': 'Navy',
    '#DC2626': 'Merah',
    '#16A34A': 'Hijau',
    '#CA8A04': 'Kuning',
    '#4B5563': 'Abu-abu',
  }
  return defaultNames[normalizedHex] || 'Custom'
}

export function getMockupUrl(
  category: string,
  colorHex: string,
  view: string
): string | null {
  const normalizedHex = colorHex ? colorHex.trim().toUpperCase() : ''

  // 1. Check custom variants uploaded by Admin/Tenant
  const customVariant = activeCustomVariants.find(
    v => v.hex?.trim().toUpperCase() === normalizedHex
  )
  if (customVariant?.mockups) {
    const customMockup =
      customVariant.mockups[view as keyof typeof customVariant.mockups] ||
      customVariant.mockups.front
    if (customMockup) {
      return customMockup
    }
  }

  // 2. Check standard static color mockups
  const colorName = HEX_TO_COLOR_NAME[normalizedHex]
  if (colorName) {
    const dirCategory = CATEGORY_NORMALIZE[category] ?? 'tshirt'
    const resolvedCategory = ['tshirt'].includes(dirCategory) ? dirCategory : 'tshirt'
    return `/mockups/${resolvedCategory}/${colorName}/${view}.png`
  }

  // 3. Fallback: if custom color variant exists without image, fallback to default white mockup
  if (customVariant) {
    return `/mockups/tshirt/white/${view}.png`
  }

  return null
}
