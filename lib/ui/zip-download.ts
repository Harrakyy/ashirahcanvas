/** Minimal browser ZIP writer for customer-owned data URL image assets. */
import type { BlueprintAsset } from '@/types/blueprint'
import { getZoneLabel } from '@/lib/config/zones'

const encoder = new TextEncoder()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function toBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('Invalid image data URL')
  const header = dataUrl.slice(0, comma)
  const body = dataUrl.slice(comma + 1)
  if (!header.includes(';base64')) return encoder.encode(decodeURIComponent(body))
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function extension(dataUrl: string): string {
  return dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+)/)?.[1]?.replace('jpeg', 'jpg') ?? 'png'
}

function namaFileZona(zone: string): string {
  return getZoneLabel(zone).toLocaleLowerCase('id-ID').replace(/\s+/g, '-')
}

function localHeader(name: Uint8Array, bytes: Uint8Array, crc: number): Uint8Array {
  const output = new Uint8Array(30 + name.length + bytes.length)
  const view = new DataView(output.buffer)
  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(8, 0, true) // Store without compression: preserves original asset bytes.
  view.setUint32(14, crc, true)
  view.setUint32(18, bytes.length, true)
  view.setUint32(22, bytes.length, true)
  view.setUint16(26, name.length, true)
  output.set(name, 30)
  output.set(bytes, 30 + name.length)
  return output
}

function centralHeader(name: Uint8Array, bytes: Uint8Array, crc: number, offset: number): Uint8Array {
  const output = new Uint8Array(46 + name.length)
  const view = new DataView(output.buffer)
  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 20, true)
  view.setUint16(10, 0, true)
  view.setUint32(16, crc, true)
  view.setUint32(20, bytes.length, true)
  view.setUint32(24, bytes.length, true)
  view.setUint16(28, name.length, true)
  view.setUint32(42, offset, true)
  output.set(name, 46)
  return output
}

/** Download every raw image in one zone as a standards-compliant ZIP file. */
export function downloadZoneAssetsZip(zone: string, assets: BlueprintAsset[]): void {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  assets.forEach((asset, index) => {
    const bytes = toBytes(asset.src)
    const name = encoder.encode(`${namaFileZona(zone)}-aset-${index + 1}.${extension(asset.src)}`)
    const checksum = crc32(bytes)
    const local = localHeader(name, bytes, checksum)
    locals.push(local)
    centrals.push(centralHeader(name, bytes, checksum, offset))
    offset += local.length
  })

  const centralSize = centrals.reduce((total, entry) => total + entry.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, assets.length, true)
  endView.setUint16(10, assets.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)

  const url = URL.createObjectURL(new Blob([...locals, ...centrals, end], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${namaFileZona(zone)}-aset.zip`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
