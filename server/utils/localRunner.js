// Runs code directly on this machine using whatever interpreters/compilers
// are already installed (python, node, etc.) — no external sandbox service.
//
// This is appropriate for a personal, single-user dev tool running on your
// own computer with your own code. It does NOT sandbox execution — code runs
// with normal user privileges, the same way running a script from your
// terminal or VS Code's "Run" button would.

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RUNNERS = {
    javascript: { kind: 'interpret', cmd: 'node', ext: 'js' },
    python: { kind: 'interpret', cmd: 'python', ext: 'py' },
    ruby: { kind: 'interpret', cmd: 'ruby', ext: 'rb' },
    php: { kind: 'interpret', cmd: 'php', ext: 'php' },
    perl: { kind: 'interpret', cmd: 'perl', ext: 'pl' },
    lua: { kind: 'interpret', cmd: 'lua', ext: 'lua' },
    bash: { kind: 'interpret', cmd: 'bash', ext: 'sh' },
    r: { kind: 'interpret', cmd: 'Rscript', ext: 'r' },
    go: { kind: 'run', cmd: 'go', argsPrefix: ['run'], ext: 'go' },
    c: { kind: 'compile', compileCmd: 'gcc', ext: 'c' },
    cpp: { kind: 'compile', compileCmd: 'g++', ext: 'cpp' },
    rust: { kind: 'compile', compileCmd: 'rustc', ext: 'rs' },
    java: { kind: 'java', ext: 'java' },
};

function extFor(language) {
    const r = RUNNERS[language];
    return r ? r.ext : 'txt';
}

function runCode(language, code, opts) {
    opts = opts || {};
    const stdin = opts.stdin || '';
    const timeoutMs = opts.timeoutMs || 10000;

    return new Promise((resolve) => {
        const runner = RUNNERS[language];
        if (!runner) {
            resolve({
                notInstalled: true,
                error: `'${language}' isn't supported for local execution yet. Python and JavaScript work out of the box; other languages need their own compiler/interpreter installed and on your PATH.`,
            });
            return;
        }

        let workDir;
        try {
            workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codelens-'));
        } catch (e) {
            resolve({ notInstalled: false, stdout: '', stderr: `Could not create temp folder: ${e.message}`, exitCode: 1 });
            return;
        }

        const filename = runner.kind === 'java' ? guessJavaFilename(code) : `main.${runner.ext}`;
        const filepath = path.join(workDir, filename);

        try {
            fs.writeFileSync(filepath, code, 'utf-8');
        } catch (e) {
            cleanup(workDir);
            resolve({ notInstalled: false, stdout: '', stderr: `Could not write temp file: ${e.message}`, exitCode: 1 });
            return;
        }

        const finish = (result) => { cleanup(workDir);
            resolve(result); };

        if (runner.kind === 'interpret' || runner.kind === 'run') {
            const args = (runner.argsPrefix || []).concat([filepath]);
            const child = execFile(runner.cmd, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, cwd: workDir }, (err, stdout, stderr) => {
                if (err && err.code === 'ENOENT') {
                    finish({ notInstalled: true, error: `'${runner.cmd}' isn't installed, or isn't on your PATH.` });
                    return;
                }
                finish({
                    stdout: stdout || '',
                    stderr: stderr || (err ? String(err.message) : ''),
                    exitCode: err && typeof err.code === 'number' ? err.code : (err ? 1 : 0),
                    timedOut: Boolean(err && err.killed),
                });
            });
            if (stdin && child.stdin) { child.stdin.write(stdin);
                child.stdin.end(); }
            return;
        }

        if (runner.kind === 'compile') {
            const outBin = path.join(workDir, process.platform === 'win32' ? 'a.exe' : 'a.out');
            execFile(runner.compileCmd, [filepath, '-o', outBin], { timeout: timeoutMs, cwd: workDir }, (cErr, cOut, cErrText) => {
                if (cErr && cErr.code === 'ENOENT') {
                    finish({ notInstalled: true, error: `'${runner.compileCmd}' isn't installed, or isn't on your PATH.` });
                    return;
                }
                if (cErr) {
                    finish({ stdout: '', stderr: cErrText || String(cErr.message), exitCode: 1 });
                    return;
                }
                const child = execFile(outBin, [], { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, cwd: workDir }, (rErr, rOut, rErrText) => {
                    finish({
                        stdout: rOut || '',
                        stderr: rErrText || (rErr ? String(rErr.message) : ''),
                        exitCode: rErr && typeof rErr.code === 'number' ? rErr.code : (rErr ? 1 : 0),
                    });
                });
                if (stdin && child.stdin) { child.stdin.write(stdin);
                    child.stdin.end(); }
            });
            return;
        }

        if (runner.kind === 'java') {
            execFile('javac', [filepath], { timeout: timeoutMs, cwd: workDir }, (cErr, cOut, cErrText) => {
                if (cErr && cErr.code === 'ENOENT') {
                    finish({ notInstalled: true, error: `Java (javac) isn't installed, or isn't on your PATH.` });
                    return;
                }
                if (cErr) {
                    finish({ stdout: '', stderr: cErrText || String(cErr.message), exitCode: 1 });
                    return;
                }
                const className = path.basename(filepath, '.java');
                const child = execFile('java', ['-cp', workDir, className], { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, cwd: workDir }, (rErr, rOut, rErrText) => {
                    finish({
                        stdout: rOut || '',
                        stderr: rErrText || (rErr ? String(rErr.message) : ''),
                        exitCode: rErr && typeof rErr.code === 'number' ? rErr.code : (rErr ? 1 : 0),
                    });
                });
                if (stdin && child.stdin) { child.stdin.write(stdin);
                    child.stdin.end(); }
            });
            return;
        }

        finish({ notInstalled: true, error: `Local execution for '${language}' isn't implemented.` });
    });
}

// Java requires the filename to match the public class name — best-effort extraction
function guessJavaFilename(code) {
    const m = code.match(/public\s+class\s+([A-Za-z_$][\w$]*)/);
    return (m ? m[1] : 'Main') + '.java';
}

function cleanup(workDir) {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

module.exports = { runCode, extFor, RUNNERS };