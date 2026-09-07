export const imageBreakpoints = [480, 768, 1024, 1280, 1600];

/** Cap both axes, including portrait images. Never enlarge a small original. */
export function imageOptions(source: { width: number; height: number; format?: string }) {
  const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
  const width = Math.max(1, Math.floor(source.width * scale));
  const height = Math.max(1, Math.floor(source.height * scale));
  return {
    width,
    height,
    widths:
      source.format === 'svg'
        ? [width]
        : [...new Set([...imageBreakpoints.filter((size) => size < width), width])],
    layout: 'constrained' as const,
    format: source.format === 'svg' ? ('svg' as const) : ('webp' as const),
    quality: 80,
  };
}

export function ogDimensions(source: { width: number; height: number }) {
  const scale = Math.min(1, source.width / 1200, source.height / 630);
  return {
    width: Math.max(1, Math.floor(1200 * scale)),
    height: Math.max(1, Math.floor(630 * scale)),
  };
}
