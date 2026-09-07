import { site } from '../config/site.ts';

/** Accept unencoded path segments; encode exactly once and preserve file URLs. */
export function url(path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const encoded = clean
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const suffix = clean && /\.[a-z0-9]+$/i.test(clean) ? '' : '/';
  return `${site.base}${encoded ? `/${encoded}` : ''}${suffix}`;
}

export function absolute(path = ''): string {
  return new URL(url(path), site.origin).href;
}

export function assetAbsolute(path: string): string {
  return new URL(path, site.origin).href;
}
