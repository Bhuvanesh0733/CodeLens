const { runCode, extFor } = require('../utils/localRunner');
const { addToHistory } = require('./history');

// ─── Language-specific instrumentation ───────────────────────────────────────

function instrumentPython(code) {
    const prefix = `import sys, json as _json

_original_print = print

# Any frame whose CURRENT line is below this number belongs to this
# instrumentation harness itself, not to the user's code. It gets set to
# its real value right before 'try:' below, once we know exactly which
# physical line the user's code starts on. Used instead of a name check
# (e.g. "does this frame's name start with '_'") because helpers like
# _print_patched below use a generator expression internally
# (str(a) for a in args) -- and a <genexpr> frame doesn't start with
# '_', so a name-only filter lets it leak through and get reported with
# a line number from this prefix, not from the user's file.
_USER_CODE_START = 0

def _print_patched(*args, **kwargs):
    s = ' '.join(str(a) for a in args)
    _original_print(_json.dumps({'t':'out','s':s}), flush=True)

print = _print_patched

def _collect_stack(frame):
    frames = []
    f = frame
    while f is not None:
        try:
            base = f.f_code.co_filename.replace('\\\\', '/').split('/')[-1]
        except:
            base = ''
        if base == 'main.py' and f.f_lineno >= _USER_CODE_START:
            name = f.f_code.co_name
            display_name = 'main' if name == '<module>' else name
            locs = {}
            for k, v in f.f_locals.items():
                if not k.startswith('_'):
                    try:
                        sv = str(v)
                        locs[k] = sv[:80]
                    except:
                        locs[k] = '<object>'
            frames.append({'name': display_name, 'line': f.f_lineno, 'vars': locs})
        f = f.f_back
    frames.reverse()
    return frames

def _tracer(frame, event, arg):
    try:
        base = frame.f_code.co_filename.replace('\\\\', '/').split('/')[-1]
    except:
        base = ''
    if base != 'main.py' or frame.f_lineno < _USER_CODE_START:
        return None
    if event == 'line':
        stack = _collect_stack(frame)
        _original_print(_json.dumps({'t':'trace','l':frame.f_lineno,'stack':stack}), flush=True)
    return _tracer

sys.settrace(_tracer)
_original_print(_json.dumps({'t':'marker','l':sys._getframe().f_lineno}), flush=True); _USER_CODE_START = sys._getframe().f_lineno + 2
try:
`;
    // We no longer try to manually count lines in the JS template above (that
    // approach kept drifting out of sync). Instead, the '_original_print(...
    // marker...)' line just before 'try:' reports ITS OWN real physical line
    // number at runtime, computed by Python itself — that's used downstream
    // to work out exactly where the user's code starts, so it can never
    // drift out of sync with this template again.
    const wrapper = prefix + code.split('\n').map(l => '    ' + l).join('\n') + `
except Exception as _e:
    _original_print(_json.dumps({'t':'error','msg':str(_e),'line':0}), flush=True)
finally:
    sys.settrace(None)
`;
    return { wrapper };
}

// Mask out string/comment contents on a single line so brace-counting and
// declaration detection don't get confused by braces/keywords inside strings.
function maskLine(line) {
    let masked = '';
    let i = 0;
    const n = line.length;
    while (i < n) {
        const c = line[i];
        if (c === '/' && line[i + 1] === '/') {
            masked += ' '.repeat(n - i);
            break;
        }
        if (c === '/' && line[i + 1] === '*') {
            const end = line.indexOf('*/', i + 2);
            if (end === -1) { masked += ' '.repeat(n - i); break; }
            masked += ' '.repeat(end + 2 - i);
            i = end + 2;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') {
            const quote = c;
            let j = i + 1;
            while (j < n && line[j] !== quote) {
                if (line[j] === '\\') j++;
                j++;
            }
            j = Math.min(j + 1, n);
            masked += ' '.repeat(j - i);
            i = j;
            continue;
        }
        masked += c;
        i++;
    }
    return masked;
}

function extractParams(masked) {
    const m =
        masked.match(/function\s*[A-Za-z_$][\w$]*\s*\(([^)]*)\)/) ||
        masked.match(/\(([^)]*)\)\s*=>/) ||
        masked.match(/^\s*[A-Za-z_$][\w$]*\s*\(([^)]*)\)\s*\{/);
    if (!m) return [];
    return m[1]
        .split(',')
        .map((s) => s.trim().split('=')[0].trim().replace(/^\.\.\./, ''))
        .filter((s) => /^[A-Za-z_$][\w$]*$/.test(s));
}

function instrumentJavaScript(code) {
    const lines = code.split('\n');
    const declRe = /\b(?:let|const|var)\s+([a-zA-Z_$][\w$]*)/g;
    const scopeStack = [new Set()]; // index 0 = top-level scope

    const tracePrefix = `
const __orig_log = console.log;
console.log = function(...a) {
  const s = a.map(x => { try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch(e) { return String(x); } }).join(' ');
  __orig_log(JSON.stringify({t:'out',s}));
};
console.error = function(...a) {
  const s = a.map(x => String(x)).join(' ');
  __orig_log(JSON.stringify({t:'err',s}));
};
function __safeVars(obj) {
  const out = {};
  for (const k in obj) {
    try {
      const v = obj[k];
      out[k] = (typeof v === 'object' && v !== null) ? JSON.stringify(v).slice(0, 80) : String(v);
    } catch (e) { out[k] = '<unavailable>'; }
  }
  return out;
}
function __trace(l, v) {
  __orig_log(JSON.stringify({t:'trace', l, v: __safeVars(v)}));
}
`;

    let instrumented = tracePrefix + '\ntry {\n';

    for (let idx = 0; idx < lines.length; idx++) {
        const rawLine = lines[idx];
        const lineNum = idx + 1;
        const trimmed = rawLine.trim();

        if (!trimmed) {
            instrumented += rawLine + '\n';
            continue;
        }

        const masked = maskLine(rawLine);

        const inScope = new Set();
        for (const s of scopeStack)
            for (const v of s) inScope.add(v);
        const varsSnippet = inScope.size > 0 ? `{${Array.from(inScope).join(',')}}` : '{}';

        instrumented += `  __trace(${lineNum}, ${varsSnippet}); ${rawLine}\n`;

        let dm;
        declRe.lastIndex = 0;
        while ((dm = declRe.exec(masked))) {
            scopeStack[scopeStack.length - 1].add(dm[1]);
        }

        const params = masked.includes('{') ? extractParams(masked) : [];

        for (const ch of masked) {
            if (ch === '{') {
                scopeStack.push(new Set());
            } else if (ch === '}') {
                if (scopeStack.length > 1) scopeStack.pop();
            }
        }

        if (params.length && masked.includes('{')) {
            const top = scopeStack[scopeStack.length - 1];
            for (const p of params) top.add(p);
        }
    }

    instrumented += `} catch(e) { __orig_log(JSON.stringify({t:'error',msg:e.message,line:0})); }`;
    return instrumented;
}

// ─── Parse local run output for trace steps ──────────────────────────────────
function parseTraceOutput(rawOutput, language, totalLines) {
    const steps = [];
    const lines = rawOutput.split('\n');
    let outputSoFar = '';
    let offset = 0; // set once we see the runtime marker (Python only)

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const obj = JSON.parse(trimmed);
            if (obj.t === 'marker') {
                // The marker line itself sits 2 physical lines before the
                // user's own line 1 (marker line, then 'try:', then line 1) —
                // so subtracting (marker's own line + 1) lands exactly on 1.
                offset = obj.l + 1;
            } else if (obj.t === 'trace') {
                const correctedLine = obj.l - offset;
                if (obj.stack) {
                    const correctedStack = obj.stack.map(f => Object.assign({}, f, { line: f.line - offset }));
                    const innermost = correctedStack[correctedStack.length - 1] || { vars: {} };
                    steps.push({ line: correctedLine, vars: innermost.vars || {}, stack: correctedStack, output: outputSoFar });
                } else {
                    steps.push({ line: correctedLine, vars: obj.v || {}, output: outputSoFar });
                }
            } else if (obj.t === 'out') {
                outputSoFar += (outputSoFar ? '\n' : '') + obj.s;
            } else if (obj.t === 'error') {
                steps.push({ line: obj.line || 0, vars: {}, output: outputSoFar, error: obj.msg });
            }
        } catch (e) {
            if (trimmed) outputSoFar += (outputSoFar ? '\n' : '') + trimmed;
        }
    }

    if (steps.length === 0) {
        for (let i = 1; i <= totalLines; i++) {
            steps.push({ line: i, vars: {}, output: outputSoFar });
        }
    }

    if (steps.length > 0) {
        steps.push(Object.assign({}, steps[steps.length - 1], { final: true, output: outputSoFar }));
    }

    return steps;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
async function handleVisualize(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async() => {
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
        if (!code || typeof code !== 'string' || !code.trim()) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No code provided' }));
            return;
        }

        const totalLines = code.split('\n').length;
        const TRACEABLE = ['javascript', 'python'];
        let instrumentedCode = code;

        if (language === 'python') {
            instrumentedCode = instrumentPython(code).wrapper;
        } else if (language === 'javascript') {
            instrumentedCode = instrumentJavaScript(code);
        }

        try {
            const result = await runCode(language, instrumentedCode, {});

            if (result.notInstalled) {
                res.writeHead(200);
                res.end(JSON.stringify({ error: result.error, hasError: true }));
                return;
            }

            const rawOutput = result.stdout || '';
            const rawStderr = result.stderr || '';

            let steps;
            if (TRACEABLE.indexOf(language) !== -1) {
                steps = parseTraceOutput(rawOutput, language, totalLines);
            } else {
                // Non-instrumented language: run the ORIGINAL code (not instrumentedCode,
                // since only javascript/python get real instrumentation) and build a
                // simple sequential trace from its plain output.
                const plainResult = await runCode(language, code, {});
                const finalOutput = (plainResult.stdout || '') + (plainResult.stderr ? '\n[stderr] ' + plainResult.stderr : '');
                const codeLines = code.split('\n');
                steps = [];
                for (let i = 1; i <= totalLines; i++) {
                    const codeLine = codeLines[i - 1] ? codeLines[i - 1].trim() : '';
                    if (codeLine) {
                        steps.push({ line: i, vars: {}, output: i === totalLines ? finalOutput : '' });
                    }
                }
                if (steps.length === 0) steps.push({ line: 1, vars: {}, output: finalOutput });
            }

            const hasError = (result.exitCode !== 0) || Boolean(rawStderr.trim() && !rawOutput);
            const lastStep = steps[steps.length - 1];
            const cleanOutput = TRACEABLE.indexOf(language) !== -1 ? (lastStep ? lastStep.output : '') : (result.stdout || '');

            res.writeHead(200);
            res.end(JSON.stringify({
                steps,
                totalSteps: steps.length,
                finalOutput: cleanOutput,
                stderr: rawStderr,
                exitCode: result.exitCode === undefined || result.exitCode === null ? 0 : result.exitCode,
                hasError,
                language,
                traceable: TRACEABLE.indexOf(language) !== -1,
            }));

            addToHistory({
                id: `vis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                type: 'visualize',
                filename: `main.${extFor(language)}`,
                language,
                code: code.slice(0, 20000),
                summary: hasError ? 'Visualized with an error' : `Visualized · ${steps.length} steps`,
                hasError,
                timestamp: Date.now(),
            });
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
    });
}

module.exports = { handleVisualize };