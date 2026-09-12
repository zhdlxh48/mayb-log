import { describe, expect, it } from 'vitest';
import { renderMarkdown, renderMarkdownDocument } from '$lib/server/markdown/render';

describe('Markdown policy', () => {
	it('shows ordinary raw HTML as text', async () => {
		const html = await renderMarkdown('<div>Test</div>');
		expect(html).toContain('div>Test');
		expect(html).not.toContain('<div>');
	});

	it('keeps a safe iframe and removes unsafe attributes', async () => {
		const html = await renderMarkdown(
			'<iframe src="https://example.com/embed" title="Demo" loading="lazy" srcdoc="bad" style="color:red" onload="bad()" allowfullscreen></iframe>'
		);
		expect(html).toContain('<iframe');
		expect(html).toContain('src="https://example.com/embed"');
		expect(html).toContain('title="Demo"');
		expect(html).not.toContain('srcdoc');
		expect(html).not.toContain('style=');
		expect(html).not.toContain('onload');
	});

	it('removes unsafe iframe URLs', async () => {
		const html = await renderMarkdown('<iframe src="javascript:alert(1)"></iframe>');
		expect(html).toBe('<iframe></iframe>');
	});

	it('does not allow an iframe mixed with other raw HTML', async () => {
		const html = await renderMarkdown(
			'<iframe src="https://example.com/embed"></iframe><div>Test</div>'
		);
		expect(html).not.toContain('<iframe');
		expect(html).toContain('iframe src=');
	});

	it('renders the supported note directive through the shared pipeline', async () => {
		const result = await renderMarkdownDocument(':::note{type="warning"}\n**Careful**\n:::');
		expect(result.html).toContain('<aside class="note note-warning">');
		expect(result.html).toContain('<strong>Careful</strong>');
		expect(result.diagnostics).toEqual([]);
	});

	it('shows an invalid note configuration literally with a diagnostic', async () => {
		const source = ':::note{type="banana"}\nWrong type\n:::';
		const result = await renderMarkdownDocument(source);
		expect(result.html).toContain(`<pre><code>${source}\n</code></pre>`);
		expect(result.html).toContain(source);
		expect(result.html).not.toContain('<aside');
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]).toMatchObject({
			line: 1,
			column: 1,
			code: 'directive-attributes',
			message: 'The `note` type must be one of: info, warning, success, error.'
		});
	});

	it('shows the wrong note kind literally with a diagnostic', async () => {
		const source = '::note[Wrong kind]';
		const result = await renderMarkdownDocument(source);
		expect(result.html).toContain(source);
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]).toMatchObject({
			code: 'directive-kind',
			message: 'The `note` directive must use container syntax (`:::note`).'
		});
	});

	it('shows an unknown directive literally with a diagnostic', async () => {
		const source = ':::future_widget{foo="bar"}\nContents\n:::';
		const result = await renderMarkdownDocument(source);
		expect(result.html).toContain(source);
		expect(result.html).not.toContain('<future_widget');
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]).toMatchObject({
			code: 'unknown-directive',
			message: 'Unknown directive `future_widget`.'
		});
	});
});
