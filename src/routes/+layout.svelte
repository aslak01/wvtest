<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { createApiReporter } from '$lib/utils';

	import Header from './Header.svelte';
	import './styles.css';
	import { onTTFB, onINP, onFCP, onFID } from 'web-vitals';
	import { onCLS, onLCP } from 'web-vitals/attribution';

	function generateUniqueId() {
		return `v1-${Date.now()}-${Math.floor(Math.random() * (9e12 - 1)) + 1e12}`;
	}
	$: if (browser) {
		const sendToAnalytics = createApiReporter('/analytics', {
			initial: {
				pageView: generateUniqueId(),
				userId: generateUniqueId(),
				site: 'siteId',
				url: 'www.example.com/hei'
			}
		});
		onCLS(sendToAnalytics);
		onTTFB(sendToAnalytics);
		onLCP(sendToAnalytics);
		onINP(sendToAnalytics);
		onFCP(sendToAnalytics);
		onFID(sendToAnalytics);
	}

	type ChromeWebVitalsType = {
		pageView: string;
		userId: string;
		site: string;
		url: string;
		visitDurationAtSend: number;
		cls?: {
			value: number;
			attribution: string;
		};
		fcp?: {
			value: number;
		};
		lcp?: {
			value: number;
		};
		fid?: {
			value: number;
		};
		inp?: {
			value: number;
		};
	};
</script>

<div class="app">
	<Header />

	<main>
		<slot />
	</main>

	<footer>
		<p>visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to learn SvelteKit</p>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
