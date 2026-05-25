const path = require('path');

// Agents output files in this delimited format:
//   <<<FILE: relative/path/to/file.js>>>
//   ...content...
//   <<<END>>>

const FILE_START = /<<<FILE:\s*(.+?)>>>/g;
const FILE_END   = '<<<END>>>';

function parseFiles(agentOutput) {
  const files = [];
  const parts  = agentOutput.split(/<<<FILE:\s*(.+?)>>>/);

  // parts: [preamble, path1, content1+rest, path2, content2+rest, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const rawPath   = (parts[i] || '').trim();
    const rawBody   = parts[i + 1] || '';
    const endIdx    = rawBody.indexOf(FILE_END);
    const content   = (endIdx !== -1 ? rawBody.slice(0, endIdx) : rawBody).trim();

    const safePath = _sanitizePath(rawPath);
    if (!safePath || !content) continue;

    files.push({
      filePath: safePath,
      content,
      language: _detectLanguage(safePath),
    });
  }

  return files;
}

// Block path traversal attempts
function _sanitizePath(raw) {
  const p = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (p.includes('..')) return null;
  if (p.includes('\0')) return null;
  if (!p || p.length > 260) return null;
  // Must start with a known project root dir
  const allowed = ['backend/', 'frontend/', 'README', 'package.json', '.gitignore', '.env.example', 'CLAUDE.md', 'render.yaml', 'docker-compose'];
  const ok = allowed.some((prefix) => p.startsWith(prefix) || p === prefix.replace('/', ''));
  return ok ? p : null;
}

function _detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js':    'javascript',
    '.jsx':   'javascript',
    '.ts':    'typescript',
    '.tsx':   'typescript',
    '.json':  'json',
    '.scss':  'scss',
    '.css':   'css',
    '.html':  'html',
    '.md':    'markdown',
    '.yaml':  'yaml',
    '.yml':   'yaml',
    '.sh':    'bash',
    '.env':   'dotenv',
  };
  return map[ext] || 'text';
}

module.exports = { parseFiles };
