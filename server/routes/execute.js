const { runCode, extFor } = require('../utils/localRunner');
const { addToHistory } = require('./history');

async function handleExecute(req, res) {
    const setCors = () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
    };

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async() => {
        setCors();
        let body;
        try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
        }

        const code = body.code;
        const language = body.language || 'javascript';
        const stdin = body.stdin || '';

        if (!code || typeof code !== 'string' || !code.trim()) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No code provided' }));
            return;
        }

        try {
            const result = await runCode(language, code, { stdin });

            if (result.notInstalled) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    error: result.error,
                    hint: 'Install it and make sure it is on your PATH, then try again.',
                    hasError: true,
                }));
                return;
            }

            const stderrText = result.stderr || '';
            const hasError = (result.exitCode !== 0) || Boolean(stderrText.trim());

            res.writeHead(200);
            res.end(JSON.stringify({
                stdout: result.stdout || '',
                stderr: stderrText,
                output: result.stdout || '',
                exitCode: result.exitCode === undefined || result.exitCode === null ? 0 : result.exitCode,
                signal: null,
                language,
                hasError,
            }));

            addToHistory({
                id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                type: 'execute',
                filename: `main.${extFor(language)}`,
                language,
                code: code.slice(0, 500),
                summary: hasError ? 'Ran with an error' : 'Ran successfully',
                hasError,
                timestamp: Date.now(),
            });
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
    });
}

module.exports = { handleExecute };