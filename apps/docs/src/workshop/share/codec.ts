import type { JsonValue, WorldData } from '@runek/core/data'

export type Mode = 'build' | 'lab' | 'code'
export type Stage = 'room' | 'plot' | 'none'
type Vec3 = [number, number, number]

export interface CameraState {
  position: Vec3
  target: Vec3
}

export interface LabShare {
  type: string
  props: Record<string, JsonValue>
}

/** Everything a share link carries. Only `world` is required. */
export interface SharePayload {
  world: WorldData
  code?: string
  mode?: Mode
  stage?: Stage
  camera?: CameraState
  lab?: LabShare
}

/** Beyond this many characters a link gets unwieldy; the share menu offers a file instead. */
export const SHARE_SOFT_LIMIT = 8000

const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string) => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ v: 1, ...payload }))
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

export async function decodeShare(text: string): Promise<SharePayload> {
  const bytes = await pipe(fromBase64Url(text), new DecompressionStream('deflate-raw'))
  const data = JSON.parse(new TextDecoder().decode(bytes)) as SharePayload & { v?: number }
  if (data.v !== 1 || typeof data.world !== 'object' || data.world === null) {
    throw new Error('Not a Runek workshop link (or from a newer version).')
  }
  const { v: _v, ...payload } = data
  return payload
}

/** Read `#s=…` (share) or legacy-free `#m=lab&c=bookshelf` style params from a hash. */
export function parseHash(hash: string): { share?: string; mode?: Mode; component?: string } {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const mode = params.get('m')
  return {
    share: params.get('s') ?? undefined,
    mode: mode === 'build' || mode === 'lab' || mode === 'code' ? mode : undefined,
    component: params.get('c') ?? undefined,
  }
}
