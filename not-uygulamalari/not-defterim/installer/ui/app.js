let isUninstallMode = false;
let installPath = "";

async function callApi(cmd, payload = {}) {
  const res = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd, payload })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const info = await callApi("getInfo");
    isUninstallMode = info.isUninstall || false;
    installPath = info.installDir || "";

    const pathDisplay = document.getElementById("pathDisplay");
    if (pathDisplay) pathDisplay.textContent = installPath;

    if (isUninstallMode) {
      document.getElementById("wizardTitle").innerHTML = 'Not Defterim Kaldırma Sihirbazı <span class="badge">v1.0.0</span>';
      document.getElementById("wizardSubtitle").textContent = 'Uygulamayı sisteminizden kaldırma işlemi';
      document.getElementById("stepOptions").style.display = "none";
      document.getElementById("stepUninstall").style.display = "block";
      const btnAction = document.getElementById("btnAction");
      btnAction.textContent = "Kaldır";
      btnAction.className = "btn btn-danger";
    }
  } catch (e) {
    console.error("Bilgiler alınamadı:", e);
  }

  document.getElementById("btnCancel").addEventListener("click", () => {
    callApi("exit");
  });

  document.getElementById("btnAction").addEventListener("click", async () => {
    if (isUninstallMode) {
      runUninstall();
    } else {
      runInstall();
    }
  });
});

async function runInstall() {
  const stepOptions = document.getElementById("stepOptions");
  const stepProgress = document.getElementById("stepProgress");
  const stepDone = document.getElementById("stepDone");
  const btnAction = document.getElementById("btnAction");
  const btnCancel = document.getElementById("btnCancel");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");

  stepOptions.style.display = "none";
  stepProgress.style.display = "flex";
  btnAction.style.display = "none";
  btnCancel.style.display = "none";

  const desktop = document.getElementById("chkDesktop").checked;
  const startMenu = document.getElementById("chkStartMenu").checked;
  const launch = document.getElementById("chkLaunch").checked;

  try {
    progressText.textContent = "Kurulum dizini hazırlanıyor...";
    progressBar.style.width = "25%";
    await new Promise(r => setTimeout(r, 200));

    progressText.textContent = "Not Defterim dosyaları kopyalanıyor...";
    progressBar.style.width = "60%";

    await callApi("install", {
      desktopShortcut: desktop,
      startMenuShortcut: startMenu,
      launchAfter: launch
    });

    progressText.textContent = "Kısayollar ve sistem kayıtları tamamlanıyor...";
    progressBar.style.width = "90%";
    await new Promise(r => setTimeout(r, 200));

    progressBar.style.width = "100%";
    await new Promise(r => setTimeout(r, 200));

    stepProgress.style.display = "none";
    stepDone.style.display = "flex";
    btnAction.style.display = "inline-block";
    btnAction.textContent = launch ? "Kapat ve Not Defterim'i Aç" : "Kapat";
    btnAction.className = "btn btn-primary";

    btnAction.onclick = () => {
      callApi("exit");
    };
  } catch (err) {
    progressText.textContent = "Kurulum Hatası: " + err.message;
    progressText.style.color = "#EF4444";
    btnCancel.style.display = "inline-block";
    btnCancel.textContent = "Kapat";
  }
}

async function runUninstall() {
  const stepUninstall = document.getElementById("stepUninstall");
  const stepProgress = document.getElementById("stepProgress");
  const stepDone = document.getElementById("stepDone");
  const btnAction = document.getElementById("btnAction");
  const btnCancel = document.getElementById("btnCancel");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");

  stepUninstall.style.display = "none";
  stepProgress.style.display = "flex";
  btnAction.style.display = "none";
  btnCancel.style.display = "none";

  try {
    progressText.textContent = "Kısayollar ve kayıtlar temizleniyor...";
    progressBar.style.width = "50%";

    await callApi("uninstall");

    progressBar.style.width = "100%";
    await new Promise(r => setTimeout(r, 300));

    stepProgress.style.display = "none";
    stepDone.style.display = "flex";

    document.getElementById("doneIcon").textContent = "🗑️";
    document.getElementById("doneTitle").textContent = "Kaldırma İşlemi Tamamlandı";
    document.getElementById("doneDesc").textContent = "Not Defterim başarıyla kaldırıldı. Not verileriniz güvende tutuldu.";

    btnAction.style.display = "inline-block";
    btnAction.textContent = "Kapat";
    btnAction.className = "btn btn-secondary";

    btnAction.onclick = () => {
      callApi("exit");
    };
  } catch (err) {
    progressText.textContent = "Kaldırma Hatası: " + err.message;
    progressText.style.color = "#EF4444";
    btnCancel.style.display = "inline-block";
    btnCancel.textContent = "Kapat";
  }
}

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFM9hqAxJcKjy
// SIG // iZ5HDUItHCsAx0+CoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFDJZ
// SIG // xdkXu9Ib/RNQ8pLbnlYakm8YMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAD0JWqnSDI+wxzSDM2l8AsIhwgKZJNZlQ15MMK+J
// SIG // AT97x+Rx/SrLcFC7UOiaMoTgVmMcjetGh3byvH4mKZG6
// SIG // FGRQ/SMkDydPQy06XzpxXUUGrRR2Cp2qFHAGecpoGgVI
// SIG // Iu3Z/6edSf/Y5a+GFY8qtyRAcQ6xSd3b60nq+excE37W
// SIG // wCDEdut/p/wWbgVnQLWam5Iw2DeJ4XxFPhKDRnTUhetf
// SIG // R1/M1GpOTeJQqzVYrDF6/K8s8/OaKlSg9VxPICpRH9UJ
// SIG // bMThJDr+/WK9Irx6vsfsDo9OlxZHVwmhlYuZfbvpwCDS
// SIG // TpgwQS3eQNsNvKl1do74fWTJWOCnbrktJKUvLSs=
// SIG // End signature block
