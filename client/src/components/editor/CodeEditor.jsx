import { useRef, useEffect, useState } from 'react';
import './CodeEditor.css';

// Per-language keyword sets and comment styles
const LANG_CONFIG = {
  javascript: {
    keywords: /\b(function|return|const|let|var|if|else|for|while|do|break|continue|new|typeof|instanceof|class|extends|import|export|default|async|await|try|catch|finally|throw|null|undefined|true|false|this|of|in|switch|case|yield)\b/g,
    comments: [/(\/\/[^\n]*)/g, /(\/\*[\s\S]*?\*\/)/g],
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  typescript: {
    keywords: /\b(function|return|const|let|var|if|else|for|while|do|break|continue|new|typeof|instanceof|class|extends|implements|interface|type|import|export|default|async|await|try|catch|finally|throw|null|undefined|true|false|this|of|in|switch|case|yield|public|private|protected|readonly)\b/g,
    comments: [/(\/\/[^\n]*)/g, /(\/\*[\s\S]*?\*\/)/g],
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  python: {
    keywords: /\b(def|return|if|elif|else|for|while|break|continue|pass|import|from|as|class|try|except|finally|raise|with|lambda|yield|None|True|False|self|and|or|not|in|is|global|nonlocal|async|await)\b/g,
    comments: [/(#[^\n]*)/g],
    strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|["'])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  java: {
    keywords: /\b(public|private|protected|class|interface|extends|implements|static|final|void|return|if|else|for|while|do|break|continue|new|try|catch|finally|throw|throws|import|package|this|super|null|true|false|switch|case|int|long|double|float|boolean|char|String)\b/g,
    comments: [/(\/\/[^\n]*)/g, /(\/\*[\s\S]*?\*\/)/g],
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  c: {
    keywords: /\b(int|char|float|double|void|long|short|unsigned|signed|struct|union|enum|typedef|return|if|else|for|while|do|break|continue|switch|case|default|sizeof|static|const|extern|include|define)\b/g,
    comments: [/(\/\/[^\n]*)/g, /(\/\*[\s\S]*?\*\/)/g],
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  cpp: {
    keywords: /\b(int|char|float|double|void|long|short|unsigned|signed|struct|union|enum|typedef|return|if|else|for|while|do|break|continue|switch|case|default|sizeof|static|const|extern|class|public|private|protected|namespace|using|new|delete|this|nullptr|true|false|template|typename|include)\b/g,
    comments: [/(\/\/[^\n]*)/g, /(\/\*[\s\S]*?\*\/)/g],
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  go: {
    keywords: /\b(func|return|if|else|for|range|break|continue|switch|case|default|package|import|var|const|type|struct|interface|map|chan|go|defer|select|nil|true|false)\b/g,
    comments: [/(\/\/[^\n]*)/g, /(\/\*[\s\S]*?\*\/)/g],
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  ruby: {
    keywords: /\b(def|end|return|if|elsif|else|unless|for|while|until|break|next|class|module|require|require_relative|attr_accessor|attr_reader|attr_writer|nil|true|false|self|and|or|not|do|begin|rescue|ensure|yield)\b/g,
    comments: [/(#[^\n]*)/g],
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  php: {
    keywords: /\b(function|return|if|else|elseif|for|foreach|while|do|break|continue|class|extends|implements|public|private|protected|static|new|try|catch|finally|throw|namespace|use|echo|print|null|true|false|this)\b/g,
    comments: [/(\/\/[^\n]*)/g, /(#[^\n]*)/g, /(\/\*[\s\S]*?\*\/)/g],
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  csharp: {
    keywords: /\b(public|private|protected|class|interface|static|void|return|if|else|for|foreach|while|do|break|continue|new|try|catch|finally|throw|using|namespace|this|base|null|true|false|switch|case|int|long|double|float|bool|string|var)\b/g,
    comments: [/(\/\/[^\n]*)/g, /(\/\*[\s\S]*?\*\/)/g],
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
  bash: {
    keywords: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|break|continue|export|local|echo|read)\b/g,
    comments: [/(#[^\n]*)/g],
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
  },
};

const numbers = /\b(\d+\.?\d*)\b/g;
const functions = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g;

// Language-aware syntax highlighter
function highlight(code, language = 'javascript') {
  const config = LANG_CONFIG[language] || LANG_CONFIG.javascript;

  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments first — protect them from further processing by using a placeholder
  const commentPlaceholders = [];
  for (const commentRegex of config.comments) {
    result = result.replace(commentRegex, (match) => {
      const idx = commentPlaceholders.length;
      commentPlaceholders.push(match);
      return `@@COMMENT${idx}@@`;
    });
  }

  // Strings next, also protected
  const stringPlaceholders = [];
  result = result.replace(config.strings, (match) => {
    const idx = stringPlaceholders.length;
    stringPlaceholders.push(match);
    return `@@STRING${idx}@@`;
  });

  result = result
    .replace(config.keywords, '<span class="tok-keyword">$1</span>')
    .replace(numbers, '<span class="tok-number">$1</span>')
    .replace(functions, '<span class="tok-function">$1</span>');

  // Restore strings and comments
  result = result.replace(/@@STRING(\d+)@@/g, (_, i) => `<span class="tok-string">${stringPlaceholders[+i]}</span>`);
  result = result.replace(/@@COMMENT(\d+)@@/g, (_, i) => `<span class="tok-comment">${commentPlaceholders[+i]}</span>`);

  return result;
}

export default function CodeEditor({
  value = '',
  onChange,
  language = 'javascript',
  highlightedLines = [],    // array of { line, type: 'error'|'warning'|'info'|'active' }
  activeLine = null,
  readOnly = false,
  height = '100%',
  placeholder = '// Paste or write your code here…',
}) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const gutterRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [cursorLine, setCursorLine] = useState(1);

  useEffect(() => {
    setLines(value.split('\n'));
  }, [value]);

  // Sync scroll between textarea, highlight layer, and the line-number gutter.
  // Without syncing the gutter too, it stays pinned at scrollTop 0 while the
  // textarea/highlight scroll away underneath it — so the visible numbers
  // (still 1, 2, 3…) end up lined up with whatever code has scrolled into
  // view, instead of that code's real line numbers.
  const syncScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleChange = (e) => {
    if (onChange) onChange(e.target.value);
    // Force immediate scroll sync after input
    requestAnimationFrame(syncScroll);
  };

  // Re-sync scroll whenever content changes (paste, undo, etc.)
  useEffect(() => {
    syncScroll();
  }, [value]);

  const handleKeyDown = (e) => {
    // Tab support
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newVal = value.slice(0, start) + '  ' + value.slice(end);
      if (onChange) onChange(newVal);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleSelect = (e) => {
    const pos = e.target.selectionStart;
    const lineNum = value.slice(0, pos).split('\n').length;
    setCursorLine(lineNum);
  };

  const getLineAnnotation = (lineNum) => {
    return highlightedLines.find((h) => h.line === lineNum);
  };

  const lineCount = value ? value.split('\n').length : 1;

  return (
    <div className="code-editor" style={{ height }}>
      {/* Line numbers */}
      <div className="code-editor__gutter" ref={gutterRef}>
        {Array.from({ length: lineCount }, (_, i) => {
          const lineNum = i + 1;
          const annotation = getLineAnnotation(lineNum);
          const isActive = lineNum === cursorLine || lineNum === activeLine;
          return (
            <div
              key={lineNum}
              className={`code-editor__line-num ${isActive ? 'active' : ''} ${annotation ? `ann-${annotation.type}` : ''}`}
            >
              {annotation && (
                <span className={`code-editor__ann-dot ann-dot-${annotation.type}`} title={annotation.message} />
              )}
              <span>{lineNum}</span>
            </div>
          );
        })}
      </div>

      {/* Highlight layer (behind textarea) */}
      <div className="code-editor__content">
        <div
          ref={highlightRef}
          className="code-editor__highlight thin-scroll"
          aria-hidden="true"
        >
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const annotation = getLineAnnotation(lineNum);
            const isActive = lineNum === cursorLine || lineNum === activeLine;
            return (
              <div
                key={lineNum}
                className={`code-editor__line-row ${isActive ? 'line-row--active' : ''} ${annotation ? `line-row--${annotation.type}` : ''}`}
                dangerouslySetInnerHTML={{ __html: highlight(line, language) + ' ' }}
              />
            );
          })}
        </div>

        <textarea
          ref={textareaRef}
          className="code-editor__textarea thin-scroll"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          onSelect={handleSelect}
          onClick={handleSelect}
          onKeyUp={handleSelect}
          readOnly={readOnly}
          placeholder={readOnly ? '' : placeholder}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
        />
      </div>

      {/* Status bar */}
      <div className="code-editor__status-bar">
        <span>{lineCount} lines</span>
        <span>·</span>
        <span>Ln {cursorLine}</span>
        {highlightedLines.length > 0 && (
          <>
            <span>·</span>
            <span className="code-editor__status-issues">
              {highlightedLines.filter(h => h.type === 'error').length > 0 && (
                <span className="iss-error">⚠ {highlightedLines.filter(h => h.type === 'error').length} error</span>
              )}
              {highlightedLines.filter(h => h.type === 'warning').length > 0 && (
                <span className="iss-warning">◈ {highlightedLines.filter(h => h.type === 'warning').length} warning</span>
              )}
            </span>
          </>
        )}
        <span className="code-editor__status-right">{language}</span>
      </div>
    </div>
  );
}
