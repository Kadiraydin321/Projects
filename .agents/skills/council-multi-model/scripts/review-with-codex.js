#!/usr/bin/env node

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_PROMPT_BYTES = 64 * 1024;
const SUPPORTED_CODEX_VERSION = '0.146.0';
const HOST_PROVIDERS = new Set(['anthropic', 'openai', 'unknown']);
const REQUIRED_TOOLLESS_FEATURES = Object.freeze([
  'apps',
  'auth_elicitation',
  'browser_use',
  'browser_use_external',
  'browser_use_full_cdp_access',
  'computer_use',
  'code_mode_host',
  'goals',
  'hooks',
  'image_generation',
  'in_app_browser',
  'multi_agent',
  'plugin_sharing',
  'plugins',
  'remote_plugin',
  'shell_snapshot',
  'shell_tool',
  'skill_search',
  'skill_mcp_dependency_install',
  'tool_call_mcp_elicitation',
  'tool_suggest',
  'unified_exec',
  'workspace_dependencies',
]);

function usage() {
  return [
    'Usage: review-with-codex.js --consent-to-openai --host-provider <anthropic|openai|unknown>',
    '                              [--timeout-seconds <10-120>]',
    '',
    'Reads one compact review packet from stdin and prints the labeled Codex critique.',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    consent: false,
    hostProvider: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--consent-to-openai') {
      options.consent = true;
    } else if (arg === '--host-provider') {
      options.hostProvider = argv[index + 1];
      index += 1;
    } else if (arg === '--timeout-seconds') {
      const seconds = Number(argv[index + 1]);
      if (!Number.isInteger(seconds) || seconds < 10 || seconds > 120) {
        throw new Error('--timeout-seconds must be an integer from 10 to 120');
      }
      options.timeoutMs = seconds * 1000;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (options.help) return options;
  if (!options.consent) {
    throw new Error('explicit --consent-to-openai is required');
  }
  if (!HOST_PROVIDERS.has(options.hostProvider)) {
    throw new Error('--host-provider must be anthropic, openai, or unknown');
  }
  return options;
}

function providerLabel(hostProvider) {
  if (hostProvider === 'anthropic') return 'cross-provider external critique';
  if (hostProvider === 'openai') return 'same-provider external critique';
  return 'provider relationship unverified';
}

function buildCodexArgs(tempDir, outputFile) {
  return [
    '--ask-for-approval', 'never',
    ...REQUIRED_TOOLLESS_FEATURES.flatMap((feature) => ['--disable', feature]),
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--ignore-rules',
    '--strict-config',
    '--skip-git-repo-check',
    '--sandbox', 'read-only',
    '--cd', tempDir,
    '--color', 'never',
    '--config', 'shell_environment_policy.inherit="none"',
    '--config', 'skills.include_instructions=false',
    '--config', 'web_search="disabled"',
    '--config', 'mcp_servers={}',
    '--output-last-message', outputFile,
    '-',
  ];
}

function probeCodex(spawn, args, options, label) {
  const result = spawn('codex', args, options);
  if (result.error) {
    if (result.error.code === 'ENOENT') throw new Error('Codex CLI is not installed');
    throw new Error(`Codex ${label} probe failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || '').trim().split('\n').slice(-1)[0];
    throw new Error(`Codex ${label} probe failed${detail ? `: ${detail}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function verifyToollessSupport(dependencies = {}) {
  const spawn = dependencies.spawnSync || spawnSync;
  const options = {
    cwd: os.tmpdir(),
    env: buildEnvironment(dependencies.env || process.env),
    encoding: 'utf8',
    timeout: 5_000,
    maxBuffer: 256 * 1024,
    windowsHide: true,
  };
  const versionText = probeCodex(spawn, ['--version'], options, 'version');
  const versionMatch = versionText.match(/^codex-cli\s+([^\s]+)$/m);
  if (!versionMatch) {
    throw new Error('Codex version could not be verified for tool-less review');
  }
  if (versionMatch[1] !== SUPPORTED_CODEX_VERSION) {
    throw new Error(
      `unsupported Codex version ${versionMatch[1]}; `
      + `tool-less review requires exactly ${SUPPORTED_CODEX_VERSION}`
    );
  }

  const featuresText = probeCodex(spawn, ['features', 'list'], options, 'feature');
  const stages = new Map();
  for (const line of featuresText.split('\n')) {
    const match = line.trim().match(
      /^(\S+)\s+(stable|under development|experimental|deprecated|removed)\s+(true|false)$/
    );
    if (match) stages.set(match[1], match[2]);
  }
  const unavailable = REQUIRED_TOOLLESS_FEATURES.filter(
    (feature) => stages.get(feature) !== 'stable'
  );
  if (unavailable.length > 0) {
    throw new Error(
      `Codex ${versionMatch[1]} cannot guarantee tool-less review; `
      + `required stable feature toggles unavailable: ${unavailable.join(', ')}`
    );
  }
  return versionMatch[1];
}

function buildEnvironment(sourceEnv = process.env) {
  const allowed = [
    'PATH', 'HOME', 'USERPROFILE', 'CODEX_HOME',
    'TMPDIR', 'TMP', 'TEMP', 'SystemRoot', 'ComSpec', 'PATHEXT',
  ];
  return Object.fromEntries(
    allowed.filter((name) => sourceEnv[name]).map((name) => [name, sourceEnv[name]])
  );
}

function runReview(prompt, options, dependencies = {}) {
  if (!prompt.trim()) throw new Error('review packet is empty');
  if (Buffer.byteLength(prompt, 'utf8') > MAX_PROMPT_BYTES) {
    throw new Error(`review packet exceeds ${MAX_PROMPT_BYTES} bytes`);
  }
  if (!options.consent) throw new Error('OpenAI transfer consent is required');
  if (options.timeoutMs < 10_000 || options.timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error('timeout is outside the 10-120 second safety range');
  }

  const spawn = dependencies.spawnSync || spawnSync;
  const environment = buildEnvironment(dependencies.env || process.env);
  const verifySupport = dependencies.verifyToollessSupport || verifyToollessSupport;
  verifySupport({ spawnSync: spawn, env: environment });
  const makeTemp = dependencies.mkdtempSync || fs.mkdtempSync;
  const readFile = dependencies.readFileSync || fs.readFileSync;
  const remove = dependencies.rmSync || fs.rmSync;
  const tempDir = makeTemp(path.join(os.tmpdir(), 'ecc-council-review-'));
  const outputFile = path.join(tempDir, 'last-message.txt');

  try {
    const result = spawn('codex', buildCodexArgs(tempDir, outputFile), {
      cwd: tempDir,
      env: environment,
      input: prompt,
      encoding: 'utf8',
      timeout: options.timeoutMs,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });

    if (result.error) {
      if (result.error.code === 'ETIMEDOUT') throw new Error('Codex review timed out');
      if (result.error.code === 'ENOENT') throw new Error('Codex CLI is not installed');
      throw new Error(`Codex invocation failed: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const detail = (result.stderr || '').trim().split('\n').slice(-1)[0];
      throw new Error(`Codex review failed${detail ? `: ${detail}` : ''}`);
    }

    let text;
    try {
      text = readFile(outputFile, 'utf8').trim();
    } catch (error) {
      throw new Error(`Codex returned no final response: ${error.message}`);
    }
    if (!text) throw new Error('Codex returned an empty final response');
    return `${providerLabel(options.hostProvider)}\n${text}`;
  } finally {
    remove(tempDir, { recursive: true, force: true });
  }
}

function runStdinReview(options, dependencies = {}) {
  const stdin = dependencies.stdin || process.stdin;
  const stdout = dependencies.stdout || process.stdout;
  const stderr = dependencies.stderr || process.stderr;
  const review = dependencies.runReview || runReview;
  const setExitCode = dependencies.setExitCode || ((code) => { process.exitCode = code; });
  const chunks = [];
  let promptBytes = 0;
  let promptOverflow = false;
  stdin.setEncoding('utf8');
  stdin.on('data', (chunk) => {
    if (promptOverflow) return;
    promptBytes += Buffer.byteLength(chunk, 'utf8');
    if (promptBytes > MAX_PROMPT_BYTES) {
      promptOverflow = true;
      chunks.length = 0;
      return;
    }
    chunks.push(chunk);
  });
  stdin.on('end', () => {
    if (promptOverflow) {
      stderr.write(
        `external review absent: review packet exceeds ${MAX_PROMPT_BYTES} bytes\n`
      );
      setExitCode(1);
      return;
    }
    try {
      stdout.write(`${review(chunks.join(''), options)}\n`);
    } catch (error) {
      stderr.write(`external review absent: ${error.message}\n`);
      setExitCode(1);
    }
  });
  return 0;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n${usage()}\n`);
    return 2;
  }

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  return runStdinReview(options);
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  MAX_PROMPT_BYTES,
  REQUIRED_TOOLLESS_FEATURES,
  SUPPORTED_CODEX_VERSION,
  buildCodexArgs,
  buildEnvironment,
  parseArgs,
  providerLabel,
  runStdinReview,
  runReview,
  verifyToollessSupport,
};

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFJaJt3Qba92Z
// SIG // nyQsd/ouPce8ZJ+0oIIDGDCCAxQwggH8oAMCAQICECO+
// SIG // hXVV+mywSC4lkmKyRmIwDQYJKoZIhvcNAQELBQAwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMw
// SIG // HhcNMjYxMTA4MDk0NDE1WhcNMzYxMTA4MDk1NDE1WjAi
// SIG // MSAwHgYDVQQDDBdBbnRpZ3Jhdml0eS1BR1ktU2NyaXB0
// SIG // czCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
// SIG // ALVYf1oFZ+beC823GUw/yiFUsl2ZhDf63Sw7QSsQIRVi
// SIG // MW2Rw6LTiIx6yMI38a9WZZ8ahXBYzaO/TGi0CVFnzt2k
// SIG // 7uwbB/03/pr1EBGrKERJFcHcJ6er1x38W8jMZDlxNMtt
// SIG // oNKv/S8xRVwbVC5fgvf63B/tMj6nfXunysARotCNe8MY
// SIG // d8lrdZfhxyhfDrAYD4has6tKJTFfqZtxWGfN/TBnQFGB
// SIG // zozhZBsbQJHZJZEwIrQX4iFSNU4zGnG57FbqIPap83OE
// SIG // uoXU9FR2diXWr7D1njVNxD6M3RwJIB5QMtlBKimKAqwL
// SIG // b0ii5jT7+uNgRv8H4xb+YKU+96pCNE54dqECAwEAAaNG
// SIG // MEQwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsG
// SIG // AQUFBwMDMB0GA1UdDgQWBBTSFBrNRdyMOGEM9VQ5lS2m
// SIG // CvSzZjANBgkqhkiG9w0BAQsFAAOCAQEAJF3bNWKL9NJV
// SIG // a/dn1dHylI79o1oUOawP/4M7vVU8iJZLIpfWC8Mb335d
// SIG // Jr6zpAMwKsAbN5nvoFeQtGFjkMzKPoUlWF0mVbeKLATi
// SIG // lk7//BV9JeXheD3V6xu0q5HuS0CA/u2yJw+TT8nuErZJ
// SIG // 2JLO4O8OghdIv2Xj6FUS0C47ebQRTUgt4Xtgr+no3QPV
// SIG // Sp4NXGxoj0KbDX1gxvrmQ3NuyWJ+nw1IR6pimzZvKXIV
// SIG // wgmBwo0udXB/na//NhpO07XX2J1T9GNOfUuc2rtuFocB
// SIG // Gog4j1dz+k4e2naHoGJ54/OFzAK20C38phicGH0EKnmf
// SIG // ZoEKnlGBoPSwBnYzbJPjuzGCAdcwggHTAgEBMDYwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMC
// SIG // ECO+hXVV+mywSC4lkmKyRmIwCQYFKw4DAhoFAKB4MBgG
// SIG // CisGAQQBgjcCAQwxCjAIoAKAAKECgAAwGQYJKoZIhvcN
// SIG // AQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEO
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFFAk
// SIG // rHNziuoWOng4G8UEO/Tm60/pMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAJGhi8c2vaSXeqjf4mm69E8a7aPaOdB13wsddcmS
// SIG // N4rFOemo4AdA+XLziXXu8r/dG9QgcLEzjKaxbibeBlaf
// SIG // C0JeTcmbuFvgF7gVcBY20iyqVEN5LTkOHybnvoK7sxQm
// SIG // 83XDLgj8etvoirJveRg63j87CMjCRWGWrgiINgW/qpVB
// SIG // XO3mLbhi8Hh/LTiKjtnnvjGVduQm97ydXjH64OgHTKAb
// SIG // Cv0yhjS9oXoZbYBoYTQPtNV+Zp2chYN7ViwZ1hnS/c70
// SIG // HpDHHuWcMq6STgvDDVckWSz14QL20S6Oa01yGvRcSV4W
// SIG // YMsQB2yho58SAR7fX2X8yXPqa2iU2hwol+aEq/0=
// SIG // End signature block
