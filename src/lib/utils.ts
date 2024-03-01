import type { Metric, MetricWithAttribution } from 'web-vitals';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = Record<string, any>;
type NetworkInformation = {
	effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
	rtt: number;
	downlink: number;
};
type CreateNetworkInformation = {
	initial?: {
		visitDurationAtSend: number | null;
		pageView: string;
		userId: string;
		site: string;
		url: string;
	};
	mapMetric?: (metric: Metric, result: Result) => Result;
	beforeSend?: (result: Result) => Result | void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onSend?: (url: string, result: Result) => any;
};

export function createApiReporter(
	url: string,
	opts: CreateNetworkInformation
): (metric: Metric | MetricWithAttribution) => void {
	let isSent = false;
	let isCalled = false;
	let result = /** @type {Result} */ { ...opts.initial };
	// let result: Result = {
	// 	visitDurationAtSend: null
	// };

	const sendValues = () => {
		if (isSent) return; // data is already sent
		if (!isCalled) return; // no data collected

		result.visitDurationAtSend = now();
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
			// third parameter indicates sync xhr
			client.open('POST', url, false);
			client.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
			client.send(JSON.stringify(result));
		}
	};

	const mapMetric =
		opts.mapMetric ||
		function (metric) {
			const isWebVital = ['FCP', 'TTFB', 'LCP', 'CLS', 'INP', 'FID'].indexOf(metric.name) !== -1;
			if (attributionElement(metric)) {
				return {
					[metric.name]: {
						value: roundToPrec(metric.value, 5),
						element: attributionElement(metric)
					}
				};
			}
			return {
				[metric.name]: { value: roundToPrec(metric.value, 0) }
			};
		};

	const report = (metric: Metric) => {
		if (!isCalled) isCalled = true;
		result = { ...result, ...mapMetric(metric, result) };
	};

	// should be the last call to capture latest CLS
	setTimeout(() => {
		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				sendValues();
				removeEventListener('visibilitychange', onVisibilityChange, true);
			}
		};
		addEventListener('visibilitychange', onVisibilityChange, true);
	});

	return report;
}

/**
 * Get time since a session started.
 */

function now() {
	if (typeof performance === 'undefined') return null;
	return roundToPrec(performance.now(), 0);
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

function attributionElement(metric: Metric | MetricWithAttribution): string | null {
	if ('attribution' in metric && metric.attribution && typeof metric.attribution === 'object') {
		const { attribution } = metric;
		if (
			'largestShiftTarget' in attribution &&
			attribution.largestShiftTarget &&
			typeof attribution.largestShiftTarget === 'string' &&
			attribution.largestShiftTarget.length > 0
		) {
			return attribution.largestShiftTarget;
		} else if (
			'element' in attribution &&
			typeof attribution?.element === 'string' &&
			attribution.element.length > 0
		) {
			return attribution.element;
		}
	}
	return null;
}
