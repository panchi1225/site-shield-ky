const tokenByteLength = 32

function toBase64Url(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function createSignatureToken() {
  const bytes = new Uint8Array(tokenByteLength)
  crypto.getRandomValues(bytes)

  return `sig_${toBase64Url(bytes)}`
}

export function createSignatureUrl(signatureToken: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/sign/${signatureToken}`
}
