import type { SearchKind } from './search.ts';

export interface SearchTextFields {
  title: string;
  name?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  tags?: string[];
  categories?: string[];
  series?: string;
  authors?: string[];
  publishedAt?: string;
}

function clean(value: string | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

export function buildSearchText(fields: SearchTextFields) {
  return [
    fields.title,
    fields.subtitle,
    fields.description,
    fields.body,
    fields.tags?.join(' '),
    fields.categories?.join(' '),
    fields.series,
    fields.authors?.join(' '),
    fields.publishedAt,
  ]
    .map(clean)
    .filter(Boolean)
    .join(' ');
}

export function buildSearchDocumentText(kind: SearchKind, fields: SearchTextFields) {
  if (kind === 'post') return buildSearchText(fields);
  if (kind === 'about')
    return buildSearchText({
      title: fields.title,
      description: fields.description,
      body: fields.body,
    });
  if (kind === 'series')
    return buildSearchText({ title: fields.title, description: fields.description });
  if (kind === 'author')
    return buildSearchText({ title: fields.title, description: fields.description });
  return buildSearchText({ title: fields.name ?? fields.title });
}

export function extractVisibleText(element: Element | null) {
  if (!element) return '';
  const copy = element.cloneNode(true) as Element;
  copy
    .querySelectorAll(
      'script, style, template, noscript, [hidden], [aria-hidden="true"], [data-search-ignore]',
    )
    .forEach((node) => node.remove());
  const imageText = [...copy.querySelectorAll('img[alt]')]
    .map((image) => image.getAttribute('alt') ?? '')
    .join(' ');
  return clean(`${copy.textContent ?? ''} ${imageText}`);
}

export function readSearchList(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
