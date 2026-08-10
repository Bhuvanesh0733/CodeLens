const { reviewEmitter } = require('../events/emitter');
const { addToHistory } = require('./history');

function checkApiKey() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not set in server/.env');
    }
}

const SYSTEM_PROMPT = `You are CodeLens AI — an expert code analyst. Analyze the provided code and return a JSON response.

Your response MUST be valid JSON with this exact structure:
{
  "summary": "Brief one-sentence overview of what the code does",
  "overallScore": 72,
  "insights": [
    {
      "id": 1,
      "type": "bug" | "performance" | "suggestion" | "warning",
      "severity": "critical" | "high" | "medium" | "low",
      "title": "Short title",
      "line": 14,
      "message": "Clear explanation of the issue",
      "fix": "Specific code fix or suggestion"
    }
  ],
  "improvedCode": "The full corrected/improved version of the code",
  "complexity": "O(n²)",
  "language": "javascript"
}

Be specific, helpful, and educational. Focus on:
- Actual bugs (off-by-one, undefined variables, scope issues)
- Performance problems (unnecessary loops, bad complexity)
- Language-specific gotchas (var hoisting, closure-in-loop, type coercion, etc.)
- Improvement suggestions (early termination, better patterns)

Return ONLY the JSON. No markdown, no explanation outside the JSON.`;

async function handleReview(req, res) {
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
    });

    const send = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const chunks = [];
    req.on('data', (chunk) => {
        chunks.push(chunk);
    });

    req.on('error', (err) => {
        reviewEmitter.emit('review:error', { id: reviewId, error: err.message });
        send('error', { message: 'Failed to read request body' });
        res.end();
    });

    req.on('end', async () => {
        let body;
        try {
            const buffer = Buffer.concat(chunks);
            body = JSON.parse(buffer.toString('utf-8'));
        } catch (e) {
            send('error', { message: 'Invalid JSON in request body' });
            res.end();
            return;
        }

        const { code, language = 'javascript', filename = 'snippet' } = body;

        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            send('error', { message: 'No code provided' });
            res.end();
            return;
        }

        reviewEmitter.emit('review:started', { id: reviewId, filename, timestamp: Date.now() });
        send('status', { phase: 'parsing', message: 'Parsing code structure…', id: reviewId });

        try {
            checkApiKey();
        } catch (e) {
            send('error', { message: e.message, hint: 'Add GROQ_API_KEY to server/.env' });
            res.end();
            return;
        }

        send('status', { phase: 'analyzing', message: 'Detecting patterns…' });

        let fullText = '';
        let chunkIndex = 0;

        try {
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
                    max_tokens: 2048,
                    stream: true,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        {
                            role: 'user',
                            content: `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
                        },
                    ],
                }),
            });

            if (!groqRes.ok) {
                const errBody = await groqRes.text();
                throw new Error(`Groq API error (${groqRes.status}): ${errBody}`);
            }

            send('status', { phase: 'reviewing', message: 'Generating insights…' });

            const reader = groqRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const payload = trimmed.slice(5).trim();
                    if (payload === '[DONE]') continue;

                    try {
                        const json = JSON.parse(payload);
                        const text = json.choices && json.choices[0] && json.choices[0].delta
                            ? json.choices[0].delta.content
                            : undefined;
                        if (text) {
                            fullText += text;
                            chunkIndex++;
                            reviewEmitter.emit('chunk:received', { id: reviewId, chunkIndex, text });
                            send('chunk', { text });
                        }
                    } catch (_) {
                        // ignore malformed partial JSON line
                    }
                }
            }

            let parsed;
            try {
                const cleaned = fullText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
                parsed = JSON.parse(cleaned);
            } catch (e) {
                parsed = {
                    summary: 'Analysis complete',
                    overallScore: 0,
                    insights: [{ id: 1, type: 'warning', severity: 'low', title: 'Parse Error', line: 0, message: 'Could not parse structured response', fix: fullText }],
                    improvedCode: code,
                    complexity: 'N/A',
                    language,
                };
            }

            reviewEmitter.emit('review:complete', { id: reviewId, totalChunks: chunkIndex });
            send('status', { phase: 'complete', message: 'Analysis complete' });
            send('result', parsed);

            addToHistory({
                id: reviewId,
                type: 'review',
                filename,
                language,
                code: code.slice(0, 500),
                summary: parsed.summary,
                overallScore: parsed.overallScore,
                insightCount: parsed.insights ? parsed.insights.length : 0,
                timestamp: Date.now(),
            });

        } catch (err) {
            console.error('[REVIEW ERROR]', err.message);
            reviewEmitter.emit('review:error', { id: reviewId, error: err.message });

            const msg = err.message || '';
            if (msg.includes('API key') || msg.includes('401')) {
                send('error', { message: 'Invalid API key. Check GROQ_API_KEY in server/.env', code: 'AUTH_ERROR' });
            } else if (msg.includes('rate') || msg.includes('429')) {
                send('error', { message: 'Rate limit reached. Please wait a moment.', code: 'RATE_LIMIT' });
            } else {
                send('error', { message: `Analysis failed: ${msg}`, code: 'UNKNOWN' });
            }
        } finally {
            res.end();
        }
    });
}

module.exports = { handleReview };
