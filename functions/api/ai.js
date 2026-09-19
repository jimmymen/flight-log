const DEFAULT_AI_URL = 'https://api.deepseek.com/chat/completions';

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function onRequestPost({ request, env }) {
    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        return json({ error: 'invalid json' }, 400);
    }

    const { model, messages, temperature } = payload || {};
    if (!Array.isArray(messages) || messages.length === 0) {
        return json({ error: 'messages is required' }, 400);
    }
    if (!env.AI_KEY) {
        return json({ error: 'server AI_KEY not configured' }, 500);
    }

    const upstream = await fetch(env.AI_URL || DEFAULT_AI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AI_KEY}`,
        },
        body: JSON.stringify({
            model: model || env.AI_MODEL || 'deepseek-flash',
            messages,
            temperature: typeof temperature === 'number' ? temperature : 0.1,
            stream: false,
        }),
    });

    const text = await upstream.text();
    return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
    });
}
