import rss from '@astrojs/rss';
import { getContent } from '../lib/posts.ts';
import { site } from '../config/site.ts';
import { absolute } from '../lib/urls.ts';
import { xmlText } from '../lib/seo.ts';

export async function GET() {
  const { posts, authors } = await getContent();
  return rss({
    title: site.name,
    description: site.description,
    site: absolute(),
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    customData: '<language>ko</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: absolute(`posts/${post.id}`),
      categories: post.data.categories,
      customData: post.data.authors
        .map(
          (ref) =>
            `<dc:creator>${xmlText(authors.find((author) => author.id === ref.id)!.data.name)}</dc:creator>`,
        )
        .join(''),
    })),
  });
}
