#!/usr/bin/env node
'use strict';

/**
 * Build a counterparty master agreement from a template and a JSON spec.
 *
 * Usage: node build-agreement.js <template.md> <spec.json> <out_dir> [--require-docx | --markdown-only]
 *
 * Writes draft Markdown and requires matching DOCX unless --markdown-only is explicit.
 * No Node dependencies. DOCX conversion requires installed pandoc. Node >= 18.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DRAFT_NOTICE = '**DRAFT: For review only. Not an execution copy or authorization to send.**';
const CONVERTER_OPTIONS = { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 };

const BLANK = '______________________________';
const EMPTY_SCHEDULE_ROW = '| | | *(no entries at signing)* | | | |';

const ROLE_CLAUSES = {
  buyer: {
    title: 'REFERRAL FEE',
    role: '{cp} appoints Us on a non-exclusive basis to source and introduce counterparties for {cp}\'s requirements, and {cp} pays Us the fee in Section 3 on each Transaction with a Protected Counterparty.',
    fee: '{cp} pays Us a referral fee on each Transaction between {cp} (or its affiliates) and a Protected Counterparty introduced by Us.',
  },
  supplier: {
    title: 'SOURCING FEE',
    role: '{cp} offers capacity to Us and to buyers We introduce, and pays Us the fee in Section 3 on each Transaction with a Protected Counterparty; where We elect to buy as principal for an entry, We contract directly with {cp} on the terms stated on Schedule A.',
    fee: '{cp} pays Us a sourcing fee on each Transaction between {cp} (or its affiliates) and a Protected Counterparty introduced by Us.',
  },
  mutual: {
    title: 'REFERRAL AND SOURCING FEE',
    role: 'Each Party may introduce the other to counterparties. The Party that closes a Transaction with a Protected Counterparty introduced by the other pays the fee in Section 3; where We supply {cp} as principal, Our economics are in Our price and no fee is payable on that entry.',
    fee: 'The Party that closes a Transaction with a Protected Counterparty first introduced by the other Party pays the introducing Party the fee below.',
  },
};

function defaultDate(now = new Date()) {
  return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function encodeScheduleCell(cell) {
  const entity = character => `&#${character.codePointAt(0)};`;
  // Entities keep data out of Markdown/HTML syntax, including smart punctuation.
  // Preserve single internal spaces and ordinary dates/example text as written.
  return String(cell).replace(/\r\n|\r|\n/g, ' ')
    .replace(/[\\|`*_{}[\]<>!&#~^$'"@]/g, entity)
    .replace(/-{2,}|\.{3,}/g, run => [...run].map(entity).join(''))
    .replace(/^ +| +$| {2,}|[^\S ]/gu, run => [...run].map(entity).join(''));
}

function renderScheduleRows(rows) {
  if (rows === undefined) {
    return EMPTY_SCHEDULE_ROW;
  }
  if (!Array.isArray(rows)) {
    throw new Error('spec.schedule must be an array of six-cell rows');
  }
  if (rows.length === 0) return EMPTY_SCHEDULE_ROW;
  return Array.from(rows, (row, rowIndex) => {
    if (!Object.hasOwn(rows, rowIndex) || !Array.isArray(row) || row.length !== 6) {
      throw new Error(`spec.schedule[${rowIndex}] must be a dense six-cell array`);
    }
    const cells = Array.from(row, (cell, cellIndex) => {
      if (!Object.hasOwn(row, cellIndex) ||
          !((typeof cell === 'string' && !/\p{Surrogate}/u.test(cell)) ||
            (typeof cell === 'number' && Number.isFinite(cell)))) {
        throw new Error(`spec.schedule[${rowIndex}][${cellIndex}] must be valid Unicode text or a finite number`);
      }
      return encodeScheduleCell(cell);
    });
    return `| ${cells.join(' | ')} |`;
  }).join('\n');
}

function buildValues(spec, now) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('spec must be an object');
  }
  for (const key of ['file', 'short', 'role']) {
    if (typeof spec[key] !== 'string' || spec[key].trim() === '') {
      throw new Error(`spec.${key} is required`);
    }
  }
  // Reject path syntax on every host, including Windows paths supplied on POSIX.
  if (/[<>:"/\\|?*\p{Cc}]/u.test(spec.file) ||
      /[. ]$/.test(spec.file) ||
      /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(spec.file)) {
    throw new Error('spec.file must be a portable filename without path components or control characters');
  }
  const clauses = ROLE_CLAUSES[spec.role];
  if (!clauses) {
    throw new Error(`unknown role "${spec.role}"; expected one of ${Object.keys(ROLE_CLAUSES).join(', ')}`);
  }
  const cp = spec.short;
  const fill = text => text.split('{cp}').join(cp);
  const supplement = typeof spec.supplement === 'string' && spec.supplement.trim() ? `${spec.supplement.trim()}; ` : '';

  return {
    FEE_TITLE: clauses.title,
    CP_SHORT: cp,
    DATE: spec.date || defaultDate(now),
    CP_LEGAL: spec.legal || BLANK,
    CP_JURIS: spec.juris || BLANK,
    CP_ADDR: spec.addr || BLANK,
    ROLE_CLAUSE: fill(clauses.role),
    FEE_CLAUSE: fill(clauses.fee),
    SCHEDULE_ROWS: renderScheduleRows(spec.schedule),
    SUPPLEMENT_CLAUSE: supplement,
    CP_SIGBLOCK: (spec.legal || cp).toUpperCase(),
    CP_SIGNER: spec.signer || BLANK,
    CP_TITLE: spec.title || BLANK,
    CP_EMAIL: spec.email || BLANK,
  };
}

function render(template, spec, now) {
  const values = buildValues(spec, now);
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.split(`{{${key}}}`).join(value);
  }
  const leftover = output.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover) {
    throw new Error(`template has unfilled placeholders: ${[...new Set(leftover)].join(', ')}`);
  }
  return `${DRAFT_NOTICE}\n\n${output}`;
}

function pandocAvailable() {
  const probe = spawnSync('pandoc', ['--version'], CONVERTER_OPTIONS);
  return !probe.error && probe.status === 0;
}

function outputPaths(outDir, file) {
  const root = path.resolve(outDir);
  const destinations = ['md', 'docx'].map(extension => path.resolve(root, `${file} MASTER.${extension}`));
  for (const destination of destinations) {
    if (path.dirname(destination) !== root) {
      throw new Error('spec.file must keep generated files directly inside the output directory');
    }
    // lstat also detects dangling links. Check BOTH outputs before the first write,
    // even when conversion is disabled. The caller must control this directory;
    // these checks do not isolate concurrent hostile filesystem changes.
    let stat;
    try {
      stat = fs.lstatSync(destination);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (stat?.isSymbolicLink()) {
      throw new Error('output destination must not be a symlink');
    }
  }
  return { root, mdPath: destinations[0], docxPath: destinations[1] };
}

function build(templatePath, specPath, outDir, options = {}) {
  const template = fs.readFileSync(templatePath, 'utf8');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const markdown = render(template, spec, options.now);
  const { root, mdPath, docxPath } = outputPaths(outDir, spec.file);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(mdPath, markdown, 'utf8');

  // Generated DOCX is replaceable output. Never leave a stale or partial copy
  // beside a newly built Markdown draft, including explicit Markdown-only builds.
  fs.rmSync(docxPath, { force: true });
  const result = { markdown: mdPath, docx: null, docxSkipped: false, documentStatus: 'draft' };
  if (options.markdownOnly === true) {
    result.docxSkipped = true;
    return result;
  }
  const canConvert = options.pandoc === undefined ? pandocAvailable() : options.pandoc;
  if (!canConvert) {
    throw new Error('DOCX required: pandoc unavailable; use --markdown-only for an explicit Markdown-only draft');
  }
  try {
    const converted = spawnSync('pandoc', [mdPath, '-o', docxPath], CONVERTER_OPTIONS);
    if (converted.error || converted.status !== 0) {
      throw new Error('pandoc conversion failed; DOCX unavailable');
    }
    const artifact = fs.lstatSync(docxPath);
    if (!artifact.isFile() || artifact.size === 0) {
      throw new Error('pandoc did not produce a nonempty regular DOCX artifact');
    }
  } catch (error) {
    fs.rmSync(docxPath, { force: true });
    if (error.code === 'ENOENT') throw new Error('pandoc did not produce a DOCX artifact');
    throw error;
  }
  result.docx = docxPath;
  return result;
}

function main(argv) {
  const [templatePath, specPath, outDir, ...flags] = argv;
  if (!templatePath || !specPath || !outDir ||
      flags.some(flag => !['--require-docx', '--markdown-only'].includes(flag)) ||
      flags.length > 1) {
    console.error('usage: build-agreement.js <template.md> <spec.json> <out_dir> [--require-docx | --markdown-only]');
    return 2;
  }
  try {
    const result = build(templatePath, specPath, outDir, { markdownOnly: flags.includes('--markdown-only') });
    console.log(`wrote ${result.documentStatus} ${result.markdown}`);
    if (result.docxSkipped) {
      console.log('docx skipped: explicit Markdown-only draft; no e-sign input produced');
    } else {
      console.log(`wrote ${result.documentStatus} ${result.docx}`);
    }
    return 0;
  } catch (error) {
    console.error(`build-agreement: ${error.message}`);
    return 1;
  }
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { ROLE_CLAUSES, EMPTY_SCHEDULE_ROW, BLANK, buildValues, render, renderScheduleRows, build, main };

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFPU2MEt7n6I+
// SIG // /KgDsb6HnKJrUrNFoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFBkb
// SIG // 3ZiLKFvvELwFYcv1ASfNN9zDMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBACVMqgqLRFZa/eaf0NmU11xiie/AKLoz3v7VTlTx
// SIG // qA50nssHdiU3r1rbe64TDVVVHnblYPCB4i+7NcowgaAK
// SIG // Fm1JdKHyM1bxre1/mQ9D71ruWOAPS3CXCr5R8Ez5shVN
// SIG // czzZaPAteBPrvzsRABILnFvfEnY+/5+SwpCAPwinews8
// SIG // ZjldetDLCMZjcmL6HJEi+tXzEnBRzAhP5YQYyg7UH1mc
// SIG // 6hL1FxzgKFEkRwJ1/AbhYe06vkaYfA6guBSJpflv8PlG
// SIG // skxFrFw+RJLc3FO6I+0jDjtrH4/nXemTs0UGnpB6YuC3
// SIG // +PWOnoNNcDWn+0cCYiLeS+oII4iuoEfwrPTifJQ=
// SIG // End signature block
