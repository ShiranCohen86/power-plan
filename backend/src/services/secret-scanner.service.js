// Scans generated files for accidentally hardcoded secrets.
// Any match causes the file to be rejected (status: 'failed').

const PATTERNS = [
  { name: 'Anthropic API Key',  re: /sk-ant-[a-zA-Z0-9\-_]{20,}/g },
  { name: 'OpenAI API Key',     re: /sk-[a-zA-Z0-9]{48}/g },
  { name: 'AWS Access Key',     re: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key',     re: /(?:aws_secret|AWS_SECRET)[_A-Z]*\s*[:=]\s*['"]?[a-zA-Z0-9/+=]{40}['"]?/gi },
  { name: 'GitHub Token',       re: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'Private Key Block',  re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g },
  { name: 'Hardcoded Password', re: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi },
  { name: 'Hardcoded JWT Secret', re: /(?:jwt_secret|JWT_SECRET)\s*[:=]\s*['"][^'"]{10,}['"]/gi },
  { name: 'Hardcoded MongoDB URI', re: /mongodb(\+srv)?:\/\/[^@]+:[^@]+@[^\s'"]+/g },
];

// Safe placeholder patterns that are expected in .env.example / README
const SAFE_PATTERNS = [
  /your[-_]?key[-_]?here/i,
  /your[-_]?secret/i,
  /change[-_]?me/i,
  /example/i,
  /<[A-Z_]+>/,
  /\.\.\./,
  /placeholder/i,
];

function scan(filePath, content) {
  // Skip .env.example, README, CLAUDE.md — these intentionally show placeholders
  if (filePath.endsWith('.example') || filePath.endsWith('.md') || filePath.endsWith('.txt')) {
    return { clean: true, findings: [] };
  }

  const findings = [];
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(content)) !== null) {
      const snippet = match[0];
      const isSafe  = SAFE_PATTERNS.some((p) => p.test(snippet));
      if (!isSafe) {
        findings.push({ name, snippet: snippet.slice(0, 40) + (snippet.length > 40 ? '...' : '') });
      }
    }
  }

  return { clean: findings.length === 0, findings };
}

module.exports = { scan };
