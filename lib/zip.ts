/**
 * 浏览器端最小 ZIP 读取器。
 *
 * 只做一件事：把用户拖进来的 .zip 在本地拆成图片文件。原来的流程里 .zip 不参与
 * 「上传前压缩」（shrinkImage 只认图片 MIME），一个几百 MB 的压缩包会原样直传，
 * 在手机上就是「上传传半天」。拆成图片后每张按最长边压成 JPEG，体积通常缩到十分之一以下。
 *
 * 不引入依赖：只认 store（不压缩）和 deflate（DecompressionStream('deflate-raw')）
 * 两种最常见打包方式，其余条目跳过；整体解不开时调用方回退到「原样直传，后端解压」。
 */

const EOCD_SIG = 0x06054b50
const CD_SIG = 0x02014b50
const LOCAL_SIG = 0x04034b50
const ZIP64_LOCATOR_SIG = 0x07064b50
const ZIP64_EOCD_SIG = 0x06064b50

const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
}

const MAX_ENTRIES = 2000
const MAX_ENTRY_BYTES = 256 * 1024 * 1024
const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024
const MAX_CD_BYTES = 32 * 1024 * 1024

export function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    name.endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  )
}

function imageExtOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name)
  if (!m) return ''
  const ext = `.${m[1].toLowerCase()}`
  return IMAGE_MIME[ext] ? ext : ''
}

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  uncompressedSize: number
  localOffset: number
}

function hasSignature(dv: DataView, at: number, sig: number): boolean {
  return at >= 0 && at + 4 <= dv.byteLength && dv.getUint32(at, true) === sig
}

async function listZipEntries(file: File): Promise<ZipEntry[]> {
  const tailLen = Math.min(file.size, 22 + 0xffff)
  const tailStart = file.size - tailLen
  const tail = new DataView(await file.slice(tailStart).arrayBuffer())

  // EOCD 后面可能跟着注释，所以从尾部往前扫
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (hasSignature(tail, i, EOCD_SIG)) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP（找不到中央目录）')

  let cdSize = tail.getUint32(eocd + 12, true)
  let cdOffset = tail.getUint32(eocd + 16, true)

  // ZIP64：字段被写成 0xFFFFFFFF 时改从 ZIP64 EOCD 记录里读
  if (cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const loc = eocd - 20
    if (!hasSignature(tail, loc, ZIP64_LOCATOR_SIG)) throw new Error('ZIP64 定位记录缺失')
    const z64 = Number(tail.getBigUint64(loc + 8, true)) - tailStart
    if (z64 < 0 || z64 + 56 > file.size) throw new Error('ZIP64 记录越界')
    const rec = new DataView(await file.slice(z64, z64 + 56).arrayBuffer())
    if (!hasSignature(rec, 0, ZIP64_EOCD_SIG)) throw new Error('ZIP64 记录损坏')
    cdSize = Number(rec.getBigUint64(40, true))
    cdOffset = Number(rec.getBigUint64(48, true))
  }

  if (cdSize > MAX_CD_BYTES) throw new Error('ZIP 中央目录异常大')
  if (cdOffset + cdSize > file.size) throw new Error('ZIP 中央目录越界，文件可能没传完')

  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer())
  const decoder = new TextDecoder('utf-8')
  const entries: ZipEntry[] = []
  let p = 0

  while (p + 46 <= cd.byteLength && entries.length < MAX_ENTRIES) {
    if (cd.getUint32(p, true) !== CD_SIG) break
    const method = cd.getUint16(p + 10, true)
    let compressedSize = cd.getUint32(p + 20, true)
    let uncompressedSize = cd.getUint32(p + 24, true)
    const nameLen = cd.getUint16(p + 28, true)
    const extraLen = cd.getUint16(p + 30, true)
    const commentLen = cd.getUint16(p + 32, true)
    let localOffset = cd.getUint32(p + 42, true)
    const name = decoder.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen))

    // ZIP64 扩展字段（id=0x0001）：按 uncompressed / compressed / offset 的顺序补齐
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
      let q = p + 46 + nameLen
      const extraEnd = q + extraLen
      while (q + 4 <= extraEnd && q + 4 <= cd.byteLength) {
        const hid = cd.getUint16(q, true)
        const hlen = cd.getUint16(q + 2, true)
        if (hid === 0x0001 && q + 12 <= cd.byteLength) {
          let r = q + 4
          if (uncompressedSize === 0xffffffff && r + 8 <= cd.byteLength) {
            uncompressedSize = Number(cd.getBigUint64(r, true))
            r += 8
          }
          if (compressedSize === 0xffffffff && r + 8 <= cd.byteLength) {
            compressedSize = Number(cd.getBigUint64(r, true))
            r += 8
          }
          if (localOffset === 0xffffffff && r + 8 <= cd.byteLength) {
            localOffset = Number(cd.getBigUint64(r, true))
          }
        }
        q += 4 + hlen
      }
    }

    entries.push({ name, method, compressedSize, uncompressedSize, localOffset })
    p += 46 + nameLen + extraLen + commentLen
  }

  if (!entries.length) throw new Error('ZIP 里没读到条目')
  return entries
}

async function inflateRaw(file: File, start: number, end: number): Promise<ArrayBuffer> {
  const stream = file.slice(start, end).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).arrayBuffer()
}

async function readEntryBytes(file: File, entry: ZipEntry): Promise<ArrayBuffer> {
  if (entry.uncompressedSize > MAX_ENTRY_BYTES) throw new Error('条目过大')
  const head = new DataView(
    await file.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer(),
  )
  if (head.byteLength < 30 || head.getUint32(0, true) !== LOCAL_SIG) throw new Error('条目头损坏')
  const nameLen = head.getUint16(26, true)
  const extraLen = head.getUint16(28, true)
  const dataStart = entry.localOffset + 30 + nameLen + extraLen
  const dataEnd = dataStart + entry.compressedSize
  if (dataEnd > file.size) throw new Error('条目数据越界')

  if (entry.method === 0) return file.slice(dataStart, dataEnd).arrayBuffer()
  if (entry.method === 8) return inflateRaw(file, dataStart, dataEnd)
  throw new Error(`不支持的打包方式（method=${entry.method}）`)
}

export interface ZipExtractResult {
  files: File[]
  skipped: number
}

/**
 * 把 ZIP 里的图片拆成 File[]（按包内顺序，跳过 __MACOSX / 隐藏文件 / 目录 / 非图片）。
 * 单个条目解不开只跳过该条目；整体结构不对就抛错，由调用方回退原样上传。
 */
export async function extractImagesFromZip(
  file: File,
  onProgress?: (done: number, total: number, name: string) => void,
): Promise<ZipExtractResult> {
  const entries = await listZipEntries(file)
  const images = entries.filter((e) => {
    if (!e.name || e.name.endsWith('/')) return false
    if (e.name.startsWith('__MACOSX')) return false
    const base = e.name.split('/').pop() || ''
    if (!base || base.startsWith('.')) return false
    return imageExtOf(base) !== ''
  })

  const files: File[] = []
  let skipped = 0
  let totalOut = 0

  for (let i = 0; i < images.length; i++) {
    const entry = images[i]
    const base = entry.name.split('/').pop() || `image-${i + 1}`
    try {
      if (totalOut + entry.uncompressedSize > MAX_TOTAL_BYTES) throw new Error('解包总量超限')
      const bytes = await readEntryBytes(file, entry)
      totalOut += bytes.byteLength
      files.push(new File([bytes], base, { type: IMAGE_MIME[imageExtOf(base)] }))
    } catch {
      skipped += 1
    }
    onProgress?.(i + 1, images.length, base)
  }

  return { files, skipped }
}
