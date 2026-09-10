<script lang="ts">
	import { onMount } from 'svelte';

	type TurnstileApi = {
		ready(callback: () => void): void;
		render(
			container: HTMLElement,
			options: {
				sitekey: string;
				size: 'flexible';
				'response-field-name': string;
				'error-callback': () => void;
			}
		): string;
		remove(widgetId: string): void;
	};

	let { siteKey } = $props<{ siteKey: string }>();
	let container: HTMLDivElement;
	let widgetId: string | undefined;
	let loadError = $state(false);

	function getTurnstile() {
		return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
	}

	function renderWidget() {
		const turnstile = getTurnstile();
		if (!turnstile || widgetId) return;
		// Turnstile is the only code allowed to add children to this empty container.
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.replaceChildren();
		widgetId = turnstile.render(container, {
			sitekey: siteKey,
			size: 'flexible',
			'response-field-name': 'captcha',
			'error-callback': () => (loadError = true)
		});
	}

	function loadWidget() {
		loadError = false;
		const turnstile = getTurnstile();
		if (turnstile) {
			turnstile.ready(renderWidget);
			return;
		}

		let script = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
		if (!script) {
			script = document.createElement('script');
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			script.async = true;
			script.defer = true;
			script.dataset.turnstileScript = '';
			document.head.appendChild(script);
		}
		script.addEventListener('load', renderWidget, { once: true });
		script.addEventListener('error', () => (loadError = true), { once: true });
	}

	function restoreWidget(event: PageTransitionEvent) {
		if (!event.persisted) return;
		const turnstile = getTurnstile();
		if (widgetId && turnstile) turnstile.remove(widgetId);
		widgetId = undefined;
		loadWidget();
	}

	onMount(() => {
		loadWidget();
		window.addEventListener('pageshow', restoreWidget);
		return () => {
			window.removeEventListener('pageshow', restoreWidget);
			const turnstile = getTurnstile();
			if (widgetId && turnstile) turnstile.remove(widgetId);
		};
	});
</script>

<div class="turnstile" data-turnstile-container bind:this={container}></div>
{#if loadError}<small role="alert">로봇 확인을 불러오지 못했습니다. 페이지를 새로고침하세요.</small
	>{/if}

<style>
	.turnstile {
		width: min(100%, 300px);
		min-height: 65px;
	}
</style>
