---
name: security-hardening
description: Security hardening, auth validation, and threat defense.
version: 1.0.0
author: ECC-Ecosystem
metadata:
  origin: ECC
  dual_compatible: true
---

# Security Hardening & Threat Defense

Comprehensive security hardening patterns for modern fullstack applications and autonomous agent systems.

# Agent Security Hardening

Harden the boundaries where an agent turns untrusted data into filesystem, network, memory, or tool actions. Produce concrete controls and tests for the framework being reviewed; a checklist without enforcement evidence is incomplete.

## Important

- Treat model output, retrieved content, tool output, memory, and cross-agent messages as untrusted input.
- Default external integrations to read-only and grant each write capability separately.
- Validate at the action boundary even when an upstream prompt or schema already validated the value.
- Fail closed before a side effect when identity, destination, ownership, or containment cannot be proven.
- Before a delete, publish, credential rotation, or other irreversible action, the real tool entry point must authorize the authenticated principal for that exact operation and resource scope, then require explicit confirmation or a valid scoped pre-approval. Missing or invalid evidence blocks the action.
- Use hard bounds defined by the governing requirement and stricter values verified from deployment configuration. When neither defines a value, mark it as a required decision and test that the implementation rejects an unbounded configuration; do not invent a plausible value.

## When to Activate

- Building an autonomous agent, tool gateway, memory service, or agent-to-agent protocol
- Reviewing code that maps model output into commands, paths, URLs, credentials, or API mutations
- Isolating tenants, projects, sessions, or workspaces in a long-running agent process
- Hardening temporary files, logs, tool responses, or external-content ingestion

## Hardening Workflow

### 1. Map Trust Boundaries

List every boundary as `source -> parser -> validator -> side effect`. Include direct user input, model output, retrieved documents, memory, environment variables, tool results, and messages from other agents.

For each side effect, record:

- the identity and scope authorizing it;
- the exact validator that runs immediately before it;
- the maximum input and output size;
- the audit evidence produced;
- the recovery path if the operation is interrupted.

This step is complete when every write, command, network mutation, and credential use has one named authorization boundary.

### 2. Validate Identifiers, Environment Values, and URLs

Use an allowlist for identifiers that become filenames, keys, selectors, or command arguments. Agent IDs have the issue-defined hard maximum of 64 characters; deployment configuration may choose a stricter positive limit but cannot raise that boundary:

```python
import re

SAFE_AGENT_ID_CHARS = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_-]*$")
HARD_MAX_AGENT_ID_LENGTH = 64

def require_agent_id(value: object, *, max_length: int) -> str:
    if (
        isinstance(max_length, bool)
        or not isinstance(max_length, int)
        or not 1 <= max_length <= HARD_MAX_AGENT_ID_LENGTH
    ):
        raise RuntimeError("configured agent ID limit must be between 1 and 64")
    if (
        not isinstance(value, str)
        or len(value) > max_length
        or not SAFE_AGENT_ID_CHARS.fullmatch(value)
    ):
        raise ValueError("invalid agent identifier")
    return value
```

When an identifier becomes a CLI argument, pass it through an argv API and place it after the command's end-of-options marker where supported. Character validation is not a substitute for argument separation.

Reject missing and whitespace-only environment values before constructing a client:

```python
def require_env(name: str, environ: dict[str, str]) -> str:
    value = environ.get(name)
    if value is None or not value.strip():
        raise RuntimeError(f"{name} is required")
    return value
```

Parse URLs, allow only schemes required by the deployment, require a host, reject embedded credentials, and block private-network destinations when the URL is attacker-controlled. For every outbound connection and redirect hop, pin the connection to a validated public address or verify the connected peer address at connection time so DNS rebinding cannot cross the boundary. A credential-bearing request must use HTTPS with certificate verification before credentials are attached. Disable automatic cross-origin credential forwarding; when the scheme or origin changes, strip the credentials and reauthorize the new destination or reject the redirect. Re-run destination, connected-address, and transport validation on every hop.

This step is complete when tests reject empty, oversized, malformed, traversal-shaped, credential-bearing, and unauthorized-destination values before any side effect, and prove that DNS rebinding and cross-origin redirects cannot carry credentials to an unapproved peer.

### 3. Contain Filesystem Access

Reject absolute user-controlled paths and traversal components before joining. Reject Windows-unsafe components on every platform so behavior stays portable: reserved device names (`CON`, `NUL`, `COM1`, `LPT1`, including with an extension such as `nul.txt`), names ending in a dot or space (Win32 strips them), and `:` (drive-relative or NTFS alternate data stream syntax such as `report.txt:ads`). Resolve both the workspace and candidate path, then prove containment:

```python
import re
from pathlib import Path

WINDOWS_RESERVED_NAME = re.compile(
    r"(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(\..*)?",
    re.IGNORECASE,
)

def workspace_path(workspace: Path, requested: str) -> Path:
    # Treat both platform separators consistently before checking components.
    relative = Path(requested.replace("\\", "/"))
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("path must be workspace-relative")
    for part in relative.parts:
        if ":" in part or part.endswith((".", " ")) or WINDOWS_RESERVED_NAME.fullmatch(part):
            raise ValueError("path component is not portable")

    root = workspace.resolve(strict=True)
    candidate = (root / relative).resolve(strict=False)
    if not candidate.is_relative_to(root):
        raise ValueError("path escapes workspace")
    return candidate
```

Containment checks do not eliminate symlink races. For sensitive writes, open relative to a trusted directory handle where the platform supports it, reject symlink targets, create files exclusively, and verify ownership and permissions after opening.

This step is complete when tests cover sibling-prefix paths, nested `..`, absolute paths, symlink escapes, reserved device names, trailing dots or spaces, alternate data stream syntax, and a valid nested workspace path.

### 4. Protect Temporary Data and Credentials

- Create sensitive files with owner-only permissions such as `0o600`; create private directories with `0o700`.
- Prefer a user-private runtime directory over a shared temporary directory for credentials or tenant data.
- Create unpredictable names atomically; do not check-then-create.
- Remove temporary data in `finally`, while preserving a redacted error record when cleanup fails.
- Keep secrets out of command arguments, model context, logs, traces, exception text, and tool responses.
- Pass secrets through the platform's secret store or scoped environment injection and rotate exposed credentials.
- Treat zeroization as best effort: mutable byte buffers can be overwritten, but immutable language strings cannot be reliably erased.

This step is complete when file-mode checks, forced-error cleanup tests, and log-capture tests show that secret values never persist outside the approved boundary.

### 5. Bound and Sanitize Tool Output

Read tool output with a byte limit rather than collecting an unbounded stream. Preserve structured fields, remove disallowed control characters, and append an explicit truncation marker with the original byte count. Keep a content hash when later forensic comparison matters.

Do not silently turn malformed output into an empty success value. Return a typed failure that names the producing tool, boundary, and validation reason without echoing sensitive content.

This step is complete when oversized output, invalid encoding, terminal-control sequences, malformed structured data, and a normal response all have deterministic tests.

## Verification Gate

Before calling the framework hardened, verify all of these behaviors through its real entry point:

1. Untrusted instructions remain data and cannot trigger a tool or write.
2. An irreversible action without operation-and-resource authorization plus confirmation or scoped pre-approval leaves no side effect.
3. Cross-tenant and cross-workspace identifiers are rejected at the action boundary.
4. Traversal and symlink escape attempts leave the filesystem unchanged.
5. Forced failures leave no credential-bearing temp files or logs.
6. Oversized or malformed tool output returns an explicit bounded error.

Report the command used, exit status, rejected input, and observed absence of the side effect. Mock-only tests do not prove operating-system permissions, symlink handling, subprocess isolation, or network egress controls.

## Common Issues

### Validation exists only in the prompt

Prompt instructions are advisory. Move the same invariant into deterministic code immediately before the side effect and test a model response that violates it.

### A normalized path still escapes

String prefix checks confuse sibling paths such as `/work/app` and `/work/application`. Resolve paths and use component-aware containment, then test symlinks separately.

### Redaction happens after logging

Redact before values enter the logger, tracer, exception, or model context. Add a capture test using a sentinel secret and assert the sentinel is absent from every emitted channel.

## When NOT to Use

- Use `security-review` for ordinary application authentication, authorization, SQL injection, XSS, CSRF, and API security.
- Use `security-scan` for repository-wide automated vulnerability scanning.
- Use infrastructure-specific guidance for host, container, firewall, or cloud hardening.
- Do not use this skill for penetration testing, exploit development, or unauthorized access.

## Related Skills

- `agent-harness-construction`
- `security-review`
- `security-scan`

---

## Web & API Application Security Controls

# Security Review Skill

This skill ensures all code follows security best practices and identifies potential vulnerabilities.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features
- Storing or transmitting sensitive data
- Integrating third-party APIs

## Security Checklist

### 1. Secrets Management

#### FAIL: NEVER Do This
```typescript
const apiKey = "sk-proj-xxxxx"  // Hardcoded secret
const dbPassword = "password123" // In source code
```

#### PASS: ALWAYS Do This
```typescript
const apiKey = process.env.OPENAI_API_KEY
const dbUrl = process.env.DATABASE_URL

// Verify secrets exist
if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

#### Verification Steps
- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets in environment variables
- [ ] `.env.local` in .gitignore
- [ ] No secrets in git history
- [ ] Production secrets in hosting platform (Vercel, Railway)

### 2. Input Validation

#### Always Validate User Input
```typescript
import { z } from 'zod'

// Define validation schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

// Validate before processing
export async function createUser(input: unknown) {
  try {
    const validated = CreateUserSchema.parse(input)
    return await db.users.create(validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues }
    }
    throw error
  }
}
```

#### File Upload Validation
```typescript
function validateFileUpload(file: File) {
  // Size check (5MB max)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File too large (max 5MB)')
  }

  // Type check
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type')
  }

  // Extension check
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error('Invalid file extension')
  }

  return true
}
```

#### Verification Steps
- [ ] All user inputs validated with schemas
- [ ] File uploads restricted (size, type, extension)
- [ ] No direct use of user input in queries
- [ ] Whitelist validation (not blacklist)
- [ ] Error messages don't leak sensitive info

### 3. SQL Injection Prevention

#### FAIL: NEVER Concatenate SQL
```typescript
// DANGEROUS - SQL Injection vulnerability
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
await db.query(query)
```

#### PASS: ALWAYS Use Parameterized Queries
```typescript
// Safe - parameterized query
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)

// Or with raw SQL -- the value goes in the params array, never in the
// string. Use your driver's placeholder syntax (Postgres numbers its
// placeholders, MySQL uses "?").
await db.query(
  'SELECT * FROM users WHERE email = ?',
  [userEmail]
)
```

<!-- Do not write a literal dollar-sign-N placeholder anywhere in this file.
     Invoking this skill with arguments substitutes it away, and the example
     above then renders as concatenated SQL -- the exact anti-pattern this
     section warns against. Use "?" and name the Postgres form in prose. -->

#### Verification Steps
- [ ] All database queries use parameterized queries
- [ ] No string concatenation in SQL
- [ ] ORM/query builder used correctly
- [ ] Supabase queries properly sanitized

### 4. Authentication & Authorization

#### JWT Token Handling
```typescript
// FAIL: WRONG: localStorage (vulnerable to XSS)
localStorage.setItem('token', token)

// PASS: CORRECT: httpOnly cookies
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

#### Authorization Checks
```typescript
export async function deleteUser(userId: string, requesterId: string) {
  // ALWAYS verify authorization first
  const requester = await db.users.findUnique({
    where: { id: requesterId }
  })

  if (requester.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }

  // Proceed with deletion
  await db.users.delete({ where: { id: userId } })
}
```

#### Row Level Security (Supabase)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only view their own data
CREATE POLICY "Users view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own data
CREATE POLICY "Users update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

#### Verification Steps
- [ ] Tokens stored in httpOnly cookies (not localStorage)
- [ ] Authorization checks before sensitive operations
- [ ] Row Level Security enabled in Supabase
- [ ] Role-based access control implemented
- [ ] Session management secure

### 5. XSS Prevention

#### Sanitize HTML
```typescript
import DOMPurify from 'isomorphic-dompurify'

// ALWAYS sanitize user-provided HTML
function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

#### Content Security Policy

Start strict and loosen only with a documented removal plan. Do not default to
`'unsafe-inline'` or `'unsafe-eval'`; they neutralize much of CSP's protection
and should be treated as temporary compatibility debt.

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      base-uri 'self';
      object-src 'none';
      frame-ancestors 'none';
      script-src 'self';
      style-src 'self';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://api.example.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
]
```

#### Verification Steps
- [ ] User-provided HTML sanitized
- [ ] CSP headers configured
- [ ] No unvalidated dynamic content rendering
- [ ] React's built-in XSS protection used

### 6. CSRF Protection

#### CSRF Tokens
```typescript
import { csrf } from '@/lib/csrf'

export async function POST(request: Request) {
  const token = request.headers.get('X-CSRF-Token')

  if (!csrf.verify(token)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  // Process request
}
```

#### SameSite Cookies
```typescript
res.setHeader('Set-Cookie',
  `session=${sessionId}; HttpOnly; Secure; SameSite=Strict`)
```

#### Verification Steps
- [ ] CSRF tokens on state-changing operations
- [ ] SameSite=Strict on all cookies
- [ ] Double-submit cookie pattern implemented

### 7. Rate Limiting

#### API Rate Limiting
```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests'
})

// Apply to routes
app.use('/api/', limiter)
```

#### Expensive Operations
```typescript
// Aggressive rate limiting for searches
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many search requests'
})

app.use('/api/search', searchLimiter)
```

#### Verification Steps
- [ ] Rate limiting on all API endpoints
- [ ] Stricter limits on expensive operations
- [ ] IP-based rate limiting
- [ ] User-based rate limiting (authenticated)

### 8. Sensitive Data Exposure

#### Logging
```typescript
// FAIL: WRONG: Logging sensitive data
console.log('User login:', { email, password })
console.log('Payment:', { cardNumber, cvv })

// PASS: CORRECT: Redact sensitive data
console.log('User login:', { email, userId })
console.log('Payment:', { last4: card.last4, userId })
```

#### Error Messages
```typescript
// FAIL: WRONG: Exposing internal details
catch (error) {
  return NextResponse.json(
    { error: error.message, stack: error.stack },
    { status: 500 }
  )
}

// PASS: CORRECT: Generic error messages
catch (error) {
  console.error('Internal error:', error)
  return NextResponse.json(
    { error: 'An error occurred. Please try again.' },
    { status: 500 }
  )
}
```

#### Verification Steps
- [ ] No passwords, tokens, or secrets in logs
- [ ] Error messages generic for users
- [ ] Detailed errors only in server logs
- [ ] No stack traces exposed to users

### 9. Blockchain Security (Solana)

#### Wallet Verification
```typescript
import { verify } from '@solana/web3.js'

async function verifyWalletOwnership(
  publicKey: string,
  signature: string,
  message: string
) {
  try {
    const isValid = verify(
      Buffer.from(message),
      Buffer.from(signature, 'base64'),
      Buffer.from(publicKey, 'base64')
    )
    return isValid
  } catch (error) {
    return false
  }
}
```

#### Transaction Verification
```typescript
async function verifyTransaction(transaction: Transaction) {
  // Verify recipient
  if (transaction.to !== expectedRecipient) {
    throw new Error('Invalid recipient')
  }

  // Verify amount
  if (transaction.amount > maxAmount) {
    throw new Error('Amount exceeds limit')
  }

  // Verify user has sufficient balance
  const balance = await getBalance(transaction.from)
  if (balance < transaction.amount) {
    throw new Error('Insufficient balance')
  }

  return true
}
```

#### Verification Steps
- [ ] Wallet signatures verified
- [ ] Transaction details validated
- [ ] Balance checks before transactions
- [ ] No blind transaction signing

### 10. Dependency Security

#### Regular Updates
```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

#### Lock Files
```bash
# ALWAYS commit lock files
git add package-lock.json

# Use in CI/CD for reproducible builds
npm ci  # Instead of npm install
```

#### Verification Steps
- [ ] Dependencies up to date
- [ ] No known vulnerabilities (npm audit clean)
- [ ] Lock files committed
- [ ] Dependabot enabled on GitHub
- [ ] Regular security updates

## Security Testing

### Automated Security Tests
```typescript
// Test authentication
test('requires authentication', async () => {
  const response = await fetch('/api/protected')
  expect(response.status).toBe(401)
})

// Test authorization
test('requires admin role', async () => {
  const response = await fetch('/api/admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  })
  expect(response.status).toBe(403)
})

// Test input validation
test('rejects invalid input', async () => {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' })
  })
  expect(response.status).toBe(400)
})

// Test rate limiting
test('enforces rate limits', async () => {
  const requests = Array(101).fill(null).map(() =>
    fetch('/api/endpoint')
  )

  const responses = await Promise.all(requests)
  const tooManyRequests = responses.filter(r => r.status === 429)

  expect(tooManyRequests.length).toBeGreaterThan(0)
})
```

## Pre-Deployment Security Checklist

Before ANY production deployment:

- [ ] **Secrets**: No hardcoded secrets, all in env vars
- [ ] **Input Validation**: All user inputs validated
- [ ] **SQL Injection**: All queries parameterized
- [ ] **XSS**: User content sanitized
- [ ] **CSRF**: Protection enabled
- [ ] **Authentication**: Proper token handling
- [ ] **Authorization**: Role checks in place
- [ ] **Rate Limiting**: Enabled on all endpoints
- [ ] **HTTPS**: Enforced in production
- [ ] **Security Headers**: CSP, X-Frame-Options configured
- [ ] **Error Handling**: No sensitive data in errors
- [ ] **Logging**: No sensitive data logged
- [ ] **Dependencies**: Up to date, no vulnerabilities
- [ ] **Row Level Security**: Enabled in Supabase
- [ ] **CORS**: Properly configured
- [ ] **File Uploads**: Validated (size, type)
- [ ] **Wallet Signatures**: Verified (if blockchain)

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Web Security Academy](https://portswigger.net/web-security)

---

**Remember**: Security is not optional. One vulnerability can compromise the entire platform. When in doubt, err on the side of caution.
