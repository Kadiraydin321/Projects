; Created by "innounp" version 2.70.1
; Setup file: Granblue Fantasy Relink update 2.0.3 - 2.0.5.exe
; Inno Setup Version: 5.5.0 (Unicode)

[Setup]
AppName=Granblue Fantasy Relink update - ElAmigos
AppId={{A9931DD5-12A6-4CE9-AFFB-D128FA9B39C8}
AppVersion=2.0.5
AppPublisher=Cygames
DefaultDirName=C:\Games\Granblue Fantasy Relink
DefaultGroupName=Granblue Fantasy Relink
OutputBaseFilename=Granblue Fantasy Relink update 2.0.3 - 2.0.5
Compression=lzma2
; Encryption=yes
; PasswordHash=18e4abd9ef3773eff442e56ea3930a3dff69ee5b
; PasswordSalt=60a0f46bc0a13274
Uninstallable=no
ExtraDiskSpaceRequired=77891222777
DisableProgramGroupPage=yes
ChangesAssociations=no
ShowLanguageDialog=yes
AllowNoIcons=yes
InfoBeforeFile=embedded\InfoBefore.txt
WizardImageFile=embedded\WizardImage0.bmp
WizardSmallImageFile=embedded\WizardSmallImage0.bmp

[Files]
Source: "{tmp}\ea.bmp"; DestDir: "{tmp}"; Flags: deleteafterinstall dontcopy 
Source: "{app}\data.0.patch"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\data.1.patch"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\data.11.patch"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\data.i.patch"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\granblue_fantasy_relink.exe"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\granblue_fantasy_relink.rne"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\steam_api64.dll"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\steam_settings\disable_networking.txt"; DestDir: "{app}\steam_settings"; Flags: ignoreversion 
Source: "{app}\steam_settings\DLC.txt"; DestDir: "{app}\steam_settings"; Flags: ignoreversion 
Source: "{app}\steam_settings\offline.txt"; DestDir: "{app}\steam_settings"; Flags: ignoreversion 
Source: "{app}\batch.bat"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\hpatchz.exe"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\RapidCRC.exe"; DestDir: "{app}"; Flags: ignoreversion 
Source: "{app}\v2.0.5.xxh128"; DestDir: "{app}"; Flags: ignoreversion 

[Dirs]
Name: "{app}\data\sound\bgm\"; 
Name: "{app}\data\sound\English(US)\"; 
Name: "{app}\data\sound\Japanese\"; 
Name: "{app}\data\sound\SE\"; 
Name: "{app}\data\ui\movie\"; 

[Run]
Filename: "{app}\batch.bat"; 
Filename: "{cmd}"; Parameters: "/C del /F /Q ""{app}\hpatchz.exe"""; 
Filename: "{cmd}"; Parameters: "/C del /F /Q ""{app}\batch.bat"""; 
Filename: "{app}\RapidCRC.exe"; Parameters: "v2.0.5.xxh128"; Description: "{cm:VerifyData}"; Flags: shellexec postinstall 
Filename: "https://elamigos.site"; Description: "== ElAmigos Releases and Updates @ official site =="; Flags: shellexec postinstall nowait

[InstallDelete]
Type: files; Name: "{app}\v1.3.1.xxh128"; 

[CustomMessages]
english.NameAndVersion=%1 version %2
english.AdditionalIcons=Additional icons:
english.CreateDesktopIcon=Create a &desktop icon
english.CreateQuickLaunchIcon=Create a &Quick Launch icon
english.ProgramOnTheWeb=%1 on the Web
english.UninstallProgram=Uninstall %1
english.LaunchProgram=Launch %1
english.AssocFileExtension=&Associate %1 with the %2 file extension
english.AssocingFileExtension=Associating %1 with the %2 file extension...
AutoStartProgramGroupDescription=Startup:
AutoStartProgram=Automatically start %1
AddonHostProgramNotFound=%1 could not be located in the folder you selected.%n%nDo you want to continue anyway?
french.NameAndVersion=%1 version %2
french.AdditionalIcons=Icônes supplémentaires :
french.CreateDesktopIcon=Créer une icône sur le &Bureau
french.CreateQuickLaunchIcon=Créer une icône dans la barre de &Lancement rapide
french.ProgramOnTheWeb=Page d'accueil de %1
french.UninstallProgram=Désinstaller %1
french.LaunchProgram=Exécuter %1
french.AssocFileExtension=&Associer %1 avec l'extension de fichier %2
french.AssocingFileExtension=Associe %1 avec l'extension de fichier %2...
french.AutoStartProgramGroupDescription=Démarrage :
french.AutoStartProgram=Démarrer automatiquement %1
french.AddonHostProgramNotFound=%1 n'a pas été trouvé dans le dossier que vous avez choisi.%n%nVoulez-vous continuer malgré tout ?
italian.NameAndVersion=%1 versione %2
italian.AdditionalIcons=Icone aggiuntive:
italian.CreateDesktopIcon=Crea un'icona sul &desktop
italian.CreateQuickLaunchIcon=Crea un'icona nella &barra Avvio veloce
italian.ProgramOnTheWeb=%1 sul Web
italian.UninstallProgram=Disinstalla %1
italian.LaunchProgram=Avvia %1
italian.AssocFileExtension=&Associa l'estensione %2 a %1
italian.AssocingFileExtension=Associazione dell'estensione %2 a %1 in corso...
italian.AutoStartProgramGroupDescription=Avvio automatico:
italian.AutoStartProgram=Avvia automaticamente %1
italian.AddonHostProgramNotFound=Impossibile individuare %1 nella cartella selezionata.%n%nProseguire ugualmente?
german.NameAndVersion=%1 Version %2
german.AdditionalIcons=Zusätzliche Symbole:
german.CreateDesktopIcon=&Desktop-Symbol erstellen
german.CreateQuickLaunchIcon=Symbol in der Schnellstartleiste erstellen
german.ProgramOnTheWeb=%1 im Internet
german.UninstallProgram=%1 entfernen
german.LaunchProgram=%1 starten
german.AssocFileExtension=&Registriere %1 mit der %2-Dateierweiterung
german.AssocingFileExtension=%1 wird mit der %2-Dateierweiterung registriert...
german.AutoStartProgramGroupDescription=Beginn des Setups:
german.AutoStartProgram=Starte automatisch%1
german.AddonHostProgramNotFound=%1 konnte im ausgwählten Ordner nicht gefunden werden.%n%nMöchten Sie dennoch fortfahren?
spanish.NameAndVersion=%1 versión %2
spanish.AdditionalIcons=Iconos adicionales:
spanish.CreateDesktopIcon=Crear un icono en el &escritorio
spanish.CreateQuickLaunchIcon=Crear un icono de &Inicio Rápido
spanish.ProgramOnTheWeb=%1 en la Web
spanish.UninstallProgram=Desinstalar %1
spanish.LaunchProgram=Ejecutar %1
spanish.AssocFileExtension=&Asociar %1 con la extensión de archivo %2
spanish.AssocingFileExtension=Asociando %1 con la extensión de archivo %2...
spanish.AutoStartProgramGroupDescription=Inicio:
spanish.AutoStartProgram=Iniciar automáticamente %1
spanish.AddonHostProgramNotFound=%1 no pudo ser localizado en la carpeta seleccionada.%n%n¿Desea continuar de todas formas?
brazilian.NameAndVersion=%1 versão %2
brazilian.AdditionalIcons=Ícones adicionais:
brazilian.CreateDesktopIcon=Criar um ícone na Área de &Trabalho
brazilian.CreateQuickLaunchIcon=Criar um ícone na &Barra de Inicialização Rápida
brazilian.ProgramOnTheWeb=%1 na Internet
brazilian.UninstallProgram=Desinstalar %1
brazilian.LaunchProgram=Executar %1
brazilian.AssocFileExtension=Associar %1 com a e&xtensão de arquivo %2
brazilian.AssocingFileExtension=Associando %1 com a extensão de arquivo...
brazilian.AutoStartProgramGroupDescription=Startup:
brazilian.AutoStartProgram=Iniciar automaticamente %1
brazilian.AddonHostProgramNotFound=%1 não pôde ser localizado na pasta que você selecionou.%n%nVocê deseja continuar assim mesmo?
schinese.NameAndVersion=%1 °æ±¾ %2
schinese.AdditionalIcons=¸½¼ÓÍ¼±ê:
schinese.CreateDesktopIcon=ÔÚ×ÀÃæ´´½¨Í¼±ê(&d)
schinese.CreateQuickLaunchIcon=ÔÚ¿ì½ÝÆô¶¯À¸´´½¨Í¼±ê(&Q)
schinese.ProgramOnTheWeb=ÍøÂçÉÏµÄ %1
schinese.UninstallProgram=Ð¶ÔØ %1
schinese.LaunchProgram=ÔËÐÐ %1
schinese.AssocFileExtension=½« %1 ÓëÀ©Õ¹Ãû %2 Á¬½Ó(&A)
schinese.AssocingFileExtension=ÕýÔÚ½« %1 ÓëÀ©Õ¹Ãû %2 Á¬½Ó...
InsertDisk=請插入光盤： %1
ending=%1 - 安裝
BM=音樂
BV=視頻
BMon=ON
BMoff=OFF
InstallAdd=安裝 %1
uninstall=卸載
Language=ENU
LanguageNR=1028
Language2=zh_TW
Language3=us
IDPROP_SETUPTYPE_COMPLETE=默認%1安裝
IDPROP_SETUPTYPE_CUSTOM=自定義%1安裝
InstallingAF=安裝 %1.....
DelSaveGameFold=你想保持保存遊戲？
Config=組態
Extracting=解開 ％1 ...
Elapsed=過去
Remaining=剩餘
Hours=小時
Hour=小時
Minutes=分鐘
Minute=分鐘
Seconds=秒
Second=秒
SystemPageTitle=系統檢查
ReqSuccess=您的系統滿足最低硬件要求。
ReqNoSuccess=您的系統不符合最低硬件要求。
Processor=處理器
RAM=主記憶體
VideoCard=視頻卡
System=操作系統
ClickIT=點擊繼續安裝類型，或取消退出安裝程序。
tchinese.NameAndVersion=%1 版本 %2
tchinese.AdditionalIcons=附加圖示:
tchinese.CreateDesktopIcon=建立桌面圖示(&D)
tchinese.CreateQuickLaunchIcon=建立快速啟動圖示(&Q)
tchinese.ProgramOnTheWeb=%1 的網站
tchinese.UninstallProgram=解除安裝 %1
tchinese.LaunchProgram=啟動 %1
tchinese.AssocFileExtension=將 %1 與檔案副檔名 %2 產生關聯(&A)
tchinese.AssocingFileExtension=正在將 %1 與檔案副檔名 %2 產生關聯...
tchinese.AutoStartProgramGroupDescription=Startup:
tchinese.AutoStartProgram=Automatically start %1
tchinese.AddonHostProgramNotFound=%1 could not be located in the folder you selected.%n%nDo you want to continue anyway?
japanese.NameAndVersion=%1 バージョン %2
japanese.AdditionalIcons=アイコンを追加する:
japanese.CreateDesktopIcon=デスクトップ上にアイコンを作成する(&D)
japanese.CreateQuickLaunchIcon=クイック起動アイコンを作成する(&Q)
japanese.ProgramOnTheWeb=%1 on the Web
japanese.UninstallProgram=%1 をアンインストールする
japanese.LaunchProgram=%1 を実行する
japanese.AssocFileExtension=ファイル拡張子 %2 に %1 を関連付けます。
japanese.AssocingFileExtension=ファイル拡張子 %2 に %1 を関連付けています...
japanese.AutoStartProgramGroupDescription=スタートアップ:
japanese.AutoStartProgram=%1 を自動的に開始する
japanese.AddonHostProgramNotFound=選択されたフォルダーに %1 が見つかりませんでした。%n%nこのまま続行しますか？
koreana.NameAndVersion=%1 버전 %2
koreana.AdditionalIcons=아이콘 생성:
koreana.CreateDesktopIcon=바탕 화면에 아이콘 생성(&D)
koreana.CreateQuickLaunchIcon=빠른 실행에 아이콘 생성(&Q)
koreana.ProgramOnTheWeb=웹 상의 %1
koreana.UninstallProgram=%1 제거
koreana.LaunchProgram=%1 실행
koreana.AssocFileExtension=%2 확장자를 %1 에 연결(&A)
koreana.AssocingFileExtension=%2 확장자를 %1 에 연결 중...
InstallStuff=Install
DelSave=Do you want to DELETE saved games and configuration files?
ExtractedFile=Unpacking file:
Extracted=Installing a game...
CancelButton=Cancel
Error=Error!
ElapsedTime=Elapsed time:
RemainingTime=Remaining time:
EstimatedTime=Estimated time:
AllElapsedTime=Total time:
ChangeUserShort=Change name of the player
Usernam=Player name
ChangeUserFULL=Change in-game username.
GfxPrefs=Graphics Settings
FastInstaller=Setup has detected more than 17GB of free RAM memory. Would you like to launch a faster installer for systems with a lot of RAM?
CompMin1=Please select at least 1 item
VerifyData=Verify all game files (optional)
french.InstallStuff=Installer
french.DelSave=Voulez-vous SUPPRIMER les parties sauvegardées et les fichiers de configuration?
french.ExtractedFile=Décompression du fichier:
french.Extracted=Installation d'un jeu...
french.CancelButton=Annuler
french.Error=Erreur!
french.ElapsedTime=Temps écoulé:
french.RemainingTime=Temps restant:
french.EstimatedTime=Temps estimé:
french.AllElapsedTime=Temps total:
french.ChangeUserShort=Changer le nom du joueur
french.Usernam=Nom de joueur
french.ChangeUserFULL=Changement de nom d'utilisateur en jeu.
french.GfxPrefs=Paramètres graphiques
french.FastInstaller=Le programme d'installation a détecté plus de 17Go de mémoire vive RAM utilisable. Souhaitez-vous lancer l'installation rapide pour les systèmes dotés de beaucoup de mémoire ?
french.CompMin1=S'il vous plaît sélectionner au moins 1 article
french.VerifyData=Vérifiez tous les fichiers du jeu (facultatif)
german.InstallStuff=Installieren
german.DelSave=Möchten Sie Ihre gespeicherten Spielstände und Konfigurationsdateien LÖSCHEN?
german.ExtractedFile=Entpacke Datei:
german.Extracted=Spiel wird installiert...
german.CancelButton=Abbrechen
german.Error=Fehler!
german.ElapsedTime=Abgelaufene Zeit:
german.RemainingTime=Verbleibende Zeit:
german.EstimatedTime=Geschätzte Zeit:
german.AllElapsedTime=Gesamtzeit:
german.ChangeUserShort=Name des Spielers ändern
german.Usernam=Spielername
german.ChangeUserFULL=Verändere den Benutzernamen im Spiel.
german.GfxPrefs=Grafikeinstellungen
german.FastInstaller=Setup hat mehr als 17GB freien RAM-Speicher erkannt. Möchten Sie eine schnellere Installation für Systeme mit viel RAM starten?
german.CompMin1=Bitte wählen Sie mindestens 1 Stück
german.VerifyData=Überprüfen Sie alle Spieldateien (optional)
italian.InstallStuff=Installare
italian.DelSave=Vuoi CANCELLARE i giochi salvati e i files di configurazione?
italian.ExtractedFile=Estrazione dei file:
italian.Extracted=Installazione del gioco...
italian.CancelButton=Annullare
italian.Error=Errore!
italian.ElapsedTime=Tempo trascorso:
italian.RemainingTime=Tempo rimanente:
italian.EstimatedTime=Tempo stimato:
italian.AllElapsedTime=Tempo totale:
italian.ChangeUserShort=Modificare il nome del giocatore
italian.Usernam=Nome del giocatore
italian.ChangeUserFULL=Cambia il nome utente nel gioco.
italian.GfxPrefs=Impostazioni grafiche
italian.FastInstaller=Sono stati rilevati più di 17GB di memoria RAM liberi. Vuoi lanciare l'installazione veloce per sistemi con molta RAM?
italian.CompMin1=Seleziona almeno 1 articolo
italian.VerifyData=Verify all game files (optional)
spanish.InstallStuff=Instalar
spanish.DelSave=¿Quieres BORRAR las partidas guardadas y archivos de configuración?
spanish.ExtractedFile=Extrayendo archivo:
spanish.Extracted=Instalando el juego...
spanish.CancelButton=Cancelar
spanish.Error=¡Error!
spanish.ElapsedTime=Tiempo transcurrido:
spanish.RemainingTime=Tiempo restante:
spanish.EstimatedTime=Tiempo estimado:
spanish.AllElapsedTime=Tiempo total:
spanish.ChangeUserShort=Cambiar nombre del jugador
spanish.Usernam=Nombre del jugador
spanish.ChangeUserFULL=Cambiar el nombre de usuario en el juego.
spanish.GfxPrefs=Ajustes Gráficos
spanish.FastInstaller=El programa de instalación ha detectado más de 17GB de memoria RAM libre. ¿Quieres ejecutar un instalador más rápido para sistemas con mucha RAM?
spanish.CompMin1=Por favor, seleccione por lo menos 1 ítem
spanish.VerifyData=Verificar todos los archivos del juego (opcional)
brazilian.InstallStuff=Instalar

[Languages]
; These files are stubs
; To achieve better results after recompilation, use the real language files
Name: "english"; MessagesFile: "embedded\english.isl"; 
Name: "french"; MessagesFile: "embedded\french.isl"; 
Name: "italian"; MessagesFile: "embedded\italian.isl"; 
Name: "german"; MessagesFile: "embedded\german.isl"; 
Name: "spanish"; MessagesFile: "embedded\spanish.isl"; 
Name: "brazilian"; MessagesFile: "embedded\brazilian.isl"; 
Name: "schinese"; MessagesFile: "embedded\schinese.isl"; 
Name: "tchinese"; MessagesFile: "embedded\tchinese.isl"; 
Name: "japanese"; MessagesFile: "embedded\japanese.isl"; 
Name: "koreana"; MessagesFile: "embedded\koreana.isl"; 
