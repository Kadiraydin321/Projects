#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const text = value => typeof value === 'string' && value.trim().length > 0;
const viewportKey = value => value.trim().toLowerCase().replace(/\s+/g, '');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const states = ['loading', 'empty', 'error', 'partial', 'success', 'permission'];

// Checks the evidence record, not the visual quality or truth of observations.
function checkEvidence(report) {
  if (!object(report)) return ['report must be an object'];
  const check = (name, item, allowNotApplicable = false) => {
    if (object(item) && item.status === 'pass' && text(item.evidence)) return [];
    if (allowNotApplicable && object(item) && item.status === 'not-applicable' && text(item.reason)) return [];
    return [`${name} needs a passing observation${allowNotApplicable ? ' or a not-applicable reason' : ''}`];
  };
  const renders = Array.isArray(report.renderedEvidence) ? report.renderedEvidence : [];
  const targets = Array.isArray(report.targetViewports) ? report.targetViewports : [];
  const targetKeys = [...new Set(targets.filter(text).map(viewportKey))];
  return [
    ...(text(report.contract) ? [] : ['contract is required']),
    ...(targets.length && targets.every(text) ? [] : ['targetViewports must contain nonempty viewport strings']),
    ...targetKeys.flatMap(viewport => renders.some(item => object(item) && text(item.viewport) && viewportKey(item.viewport) === viewport)
      ? [] : [`renderedEvidence is missing target viewport ${viewport}`]),
    ...check('accessibility', report.accessibility),
    ...check('responsive', report.responsive),
    ...states.flatMap(state => check(`contentStates.${state}`, report.contentStates?.[state], true)),
    ...(renders.length ? [] : ['renderedEvidence is required']),
    ...renders.flatMap((item, i) => object(item) && text(item.viewport) && text(item.artifact) && text(item.observation)
      ? [] : [`renderedEvidence[${i}] needs viewport, artifact and observation`])
  ];
}

function main(args) {
  try {
    if (args.length !== 1) throw new Error('Usage: node check-evidence.js <local-report.json>');
    const reportPath = path.resolve(args[0]);
    const source = fs.readFileSync(reportPath, 'utf8');
    let report;
    try { report = JSON.parse(source); } catch { throw new Error('Report must contain valid JSON'); }
    const errors = checkEvidence(report);
    if (errors.length) throw new Error(errors.join('\n'));
    const root = fs.realpathSync(path.dirname(reportPath));
    for (const item of report.renderedEvidence) {
      if (path.isAbsolute(item.artifact) || path.win32.isAbsolute(item.artifact)
        || item.artifact.includes(':') || item.artifact.split(/[\\/]/).includes('..')) {
        throw new Error('Evidence artifacts must stay inside the report directory');
      }
      const artifact = path.resolve(root, item.artifact);
      const relative = path.relative(root, fs.realpathSync(artifact));
      if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
        throw new Error('Evidence artifacts must stay inside the report directory');
      }
      const info = fs.lstatSync(artifact);
      if (!info.isFile() || info.size === 0) throw new Error('Evidence artifact must be a nonempty local file');
    }
    console.log('Evidence record complete; visual correctness still requires rendered inspection.');
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { checkEvidence };

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFPtNgpIeiKeQ
// SIG // 1zkESqomHOwi6iDuoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFMAt
// SIG // GsufKq+lTZoRwRwsxbvQq1i1MA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAKjyU/etK1HQAfjVAon1eklE50bDSJ5YI65muvpn
// SIG // 2NcA0/CXInFSfmKh3TwTRxNQC6JNXTKBSkAQqsNRDS16
// SIG // CCs5ZFC6c48/ma/M5Du1/3CqHll8iKGIiiKygQAAdOnG
// SIG // Xl+0trI649Jo9a7umPlkq7X90I8fjIBaJuT12eZ84ST5
// SIG // 6FvB8srtAXJVteE7TBAA/t0JxhLfTkyffaPqzjJhJVFu
// SIG // RGRaF7uEb9oCWLWlzJ083kW3I2M9SwgZiOWshVAVQrCZ
// SIG // LOD0fZgcArilOkEUF2E0btII+u3EGDR6wmJpbIKJ2Z+5
// SIG // SyztMqrQRNa9lTHmytaDPul/9x6TdiAJ64iIsz0=
// SIG // End signature block
