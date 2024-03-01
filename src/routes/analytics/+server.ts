import { json } from '@sveltejs/kit';

export async function GET(event: Event) {
	const options: ResponseInit = {
		status: 418,
		headers: {
			X: 'Gon give it to ya'
		}
	};
	console.log(event);
	return new Response('Hello', options);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }: { request: Request }) {
	// console.log('REQ', request);

	const data = await request.json();
	console.log(data);
	return new Response('Hello', data);
	return json({ success: true });
}
