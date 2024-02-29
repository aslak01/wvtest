import type { Metric } from 'web-vitals';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = Record<string, any>;
type NetworkInformation = {
	effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
	rtt: number;
	downlink: number;
};
type CreateNetworkInformation = {
	initial: object;
	mapMetric?: (metric: Metric, result: Result) => Result;
	beforeSend?: (result: Result) => Result | void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onSend?: (url: string, result: Result) => any;
};

const initialOpts = {
	initial: {}
};
export function createApiReporter(
	url: string,
	opts: CreateNetworkInformation = initialOpts
): (metric: Metric) => void {
	let isSent = false;
	let isCalled = false;
	let result: Result = {
		id: generateUniqueId(),
		duration: null,
		...opts.initial
	};

	const sendValues = () => {
		if (isSent) return; // data is already sent
		if (!isCalled) return; // no data collected

		result.duration = now();
		if (opts.beforeSend) {
			const newResult = opts.beforeSend(result);
			if (newResult) result = { ...result, ...newResult };
		}
		isSent = true;
		if (opts.onSend) {
			opts.onSend(url, result);
		} else {
			if (typeof navigator === 'undefined') return;
			if (navigator.sendBeacon) {
				return navigator.sendBeacon(url, JSON.stringify(result));
			}
			const client = new XMLHttpRequest();
			client.open('POST', url, false); // third parameter indicates sync xhr
			client.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
			client.send(JSON.stringify(result));
		}
	};

	const mapMetric =
		opts.mapMetric ||
		function (metric) {
			const isWebVital = ['FCP', 'TTFB', 'LCP', 'CLS', 'FID'].indexOf(metric.name) !== -1;
			return {
				[metric.name]: isWebVital
					? roundToPrec(metric.value, metric.name === 'CLS' ? 4 : 1)
					: metric.value
			};
		};

	const report = (metric: Metric) => {
		if (!isCalled) isCalled = true;
		result = { ...result, ...mapMetric(metric, result) };
	};

	// should be the last call to capture latest CLS
	setTimeout(() => {
		// Safari does not fire "visibilitychange" on the tab close
		// So we have 2 options: loose Safari data, or loose LCP/CLS that depends on "visibilitychange" logic.
		// Current solution: if LCP/CLS supported, use `onHidden` otherwise, use `pagehide` to fire the callback in the end.
		//
		// More details: https://github.com/treosh/web-vitals-reporter/issues/3
		const supportedEntryTypes =
			(PerformanceObserver && PerformanceObserver.supportedEntryTypes) || [];
		const isLatestVisibilityChangeSupported = supportedEntryTypes.indexOf('layout-shift') !== -1;

		if (isLatestVisibilityChangeSupported) {
			const onVisibilityChange = () => {
				if (document.visibilityState === 'hidden') {
					sendValues();
					removeEventListener('visibilitychange', onVisibilityChange, true);
				}
			};
			addEventListener('visibilitychange', onVisibilityChange, true);
		} else {
			addEventListener('pagehide', sendValues, { capture: true, once: true });
		}
	});

	return report;
}

/**
 * Get device information.
 * - Effective connection type: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 * - Device memory: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
 */

type ExtendedNavigator = Navigator & {
	deviceMemory: number;
	connection: NetworkInformation;
};

type Nav = null | Navigator;
export function getDeviceInfo() {
	const nav: Nav = typeof navigator === 'undefined' ? null : navigator;
	const conn =
		nav && 'connection' in nav && nav.connection ? (nav as ExtendedNavigator).connection : null;
	const mem =
		nav && 'deviceMemory' in nav && nav.deviceMemory
			? (nav as ExtendedNavigator).deviceMemory
			: null;
	return {
		url: location ? location.href : null,
		referrer: document ? document.referrer : null,
		userAgent: nav ? nav.userAgent : null,
		memory: mem ? mem : undefined,
		cpus: nav ? nav.hardwareConcurrency : undefined,
		connection: conn
			? {
					effectiveType: conn.effectiveType,
					rtt: conn.rtt,
					downlink: conn.downlink
				}
			: undefined
	};
}

/**
 * Get time since a session started.
 */

function now() {
	const perf = typeof performance === 'undefined' ? null : performance;
	return perf && perf.now ? roundToPrec(perf.now()) : null;
}

/**
 * Round, source: https://stackoverflow.com/a/18358056
 */

function roundToPrec(val: number, precision = 0): number {
	return Number(Math.round(Number(`${val}e+${precision}`)) + `e-${precision}`);
}

/**
 * Generate a unique id, copied from:
 * https://github.com/GoogleChrome/web-vitals/blob/master/src/lib/generateUniqueID.ts
 */

function generateUniqueId() {
	return `v1-${Date.now()}-${Math.floor(Math.random() * (9e12 - 1)) + 1e12}`;
}
