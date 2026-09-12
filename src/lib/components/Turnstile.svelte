<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	type TurnstileApi = {
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
	let mounted = false;

	function getTurnstile() {
		return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
	}

	function renderWidget() {
		if (!mounted) return;
		const turnstile = getTurnstile();
		if (!turnstile || widgetId) return;
		// Turnstile is the only code allowed to add children to this empty container.
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.replaceChildren();
		widgetId = turnstile.render(container, {
			sitekey: siteKey,
			size: 'flexible',
			'response-field-name': 'captcha',
			'error-callback': () => {
				if (mounted) loadError = true;
			}
		});
	}

	function loadWidget() {
		if (!mounted) return;
		loadError = false;
		const turnstile = getTurnstile();
		if (turnstile) {
			renderWidget();
			return;
		}

		let script = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
		if (script?.dataset.turnstileFailed !== undefined) {
			script.remove();
			script = null;
		}
		if (!script) {
			script = document.createElement('script');
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			script.async = true;
			script.defer = true;
			script.dataset.turnstileScript = '';
			document.head.appendChild(script);
		}
		script.addEventListener('load', renderWidget, { once: true });
		script.addEventListener(
			'error',
			() => {
				if (!mounted) return;
				script.dataset.turnstileFailed = '';
				loadError = true;
			},
			{ once: true }
		);
	}

	function restoreWidget() {
		if (document.visibilityState === 'hidden' || container.childElementCount > 0) return;
		const turnstile = getTurnstile();
		if (widgetId && turnstile) turnstile.remove(widgetId);
		widgetId = undefined;
		loadWidget();
	}

	onMount(() => {
		mounted = true;
		loadWidget();
		window.addEventListener('pageshow', restoreWidget);
		return () => {
			mounted = false;
			window.removeEventListener('pageshow', restoreWidget);
			const turnstile = getTurnstile();
			if (widgetId && turnstile) turnstile.remove(widgetId);
		};
	});
</script>

<div class="turnstile" data-turnstile-container bind:this={container}></div>
{#if loadError}<small role="alert">{m.captcha_error()}</small>{/if}

<style>
	.turnstile {
		width: min(100%, 300px);
		min-height: 65px;
	}
</style>
