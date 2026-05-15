export type SignaturePoint = {
  x: number
  y: number
}

export type SignatureStroke = SignaturePoint[]

function formatNumber(value: number) {
  return Number(value.toFixed(1))
}

function strokeToPath(stroke: SignatureStroke) {
  if (stroke.length === 0) {
    return ''
  }

  if (stroke.length === 1) {
    const point = stroke[0]
    return `M ${formatNumber(point.x)} ${formatNumber(point.y)} l 0.1 0`
  }

  const [firstPoint, ...restPoints] = stroke
  return [
    `M ${formatNumber(firstPoint.x)} ${formatNumber(firstPoint.y)}`,
    ...restPoints.map(
      (point) => `L ${formatNumber(point.x)} ${formatNumber(point.y)}`,
    ),
  ].join(' ')
}

export function hasSignature(strokes: SignatureStroke[]) {
  return strokes.some((stroke) => stroke.length > 0)
}

export function createSignatureSvg(
  strokes: SignatureStroke[],
  width: number,
  height: number,
) {
  const paths = strokes
    .filter((stroke) => stroke.length > 0)
    .map((stroke) => {
      const path = strokeToPath(stroke)
      return `<path d="${path}" />`
    })
    .join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    '<g fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">',
    paths,
    '</g>',
    '</svg>',
  ].join('')
}
