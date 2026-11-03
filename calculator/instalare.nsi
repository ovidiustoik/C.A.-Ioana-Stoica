; Fișierul de instalare pentru Windows al aplicației „Taxă de timbru & competență”.
; Se construiește cu tools/construieste-calculator.py (makensis). Instalarea se face doar pentru
; utilizatorul curent, fără drepturi de administrator. Aplicația se deschide într-o fereastră proprie
; (Microsoft Edge sau Google Chrome în modul aplicație); dacă niciunul nu există, în browserul implicit.
Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"

!ifndef VERSIUNE
  !define VERSIUNE "0"
!endif
!define NUME "Taxă de timbru și competență"
!define CHEIE "Software\Microsoft\Windows\CurrentVersion\Uninstall\TaxaTimbruCompetenta"

Name "${NUME}"
OutFile "Instalare-Taxa-timbru-competenta.exe"
InstallDir "$LOCALAPPDATA\TaxaTimbruCompetenta"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${NUME} – versiunea ${VERSIUNE}"

!define MUI_ICON "..\build\icon.ico"
!define MUI_UNICON "..\build\icon.ico"
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Deschide aplicația acum"
!define MUI_FINISHPAGE_RUN_FUNCTION Deschide
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Romanian"

Var Browser

Function GasesteBrowser
  StrCpy $Browser ""
  ${If} ${FileExists} "$PROGRAMFILES32\Microsoft\Edge\Application\msedge.exe"
    StrCpy $Browser "$PROGRAMFILES32\Microsoft\Edge\Application\msedge.exe"
  ${ElseIf} ${FileExists} "$PROGRAMFILES64\Microsoft\Edge\Application\msedge.exe"
    StrCpy $Browser "$PROGRAMFILES64\Microsoft\Edge\Application\msedge.exe"
  ${ElseIf} ${FileExists} "$LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    StrCpy $Browser "$LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
  ${ElseIf} ${FileExists} "$PROGRAMFILES64\Google\Chrome\Application\chrome.exe"
    StrCpy $Browser "$PROGRAMFILES64\Google\Chrome\Application\chrome.exe"
  ${ElseIf} ${FileExists} "$PROGRAMFILES32\Google\Chrome\Application\chrome.exe"
    StrCpy $Browser "$PROGRAMFILES32\Google\Chrome\Application\chrome.exe"
  ${ElseIf} ${FileExists} "$LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    StrCpy $Browser "$LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  ${EndIf}
FunctionEnd

!macro Scurtatura LNK
  ${If} $Browser != ""
    CreateShortCut "${LNK}" "$Browser" '--app="file:///$INSTDIR\index.html"' "$INSTDIR\icon.ico" 0
  ${Else}
    CreateShortCut "${LNK}" "$INSTDIR\index.html" "" "$INSTDIR\icon.ico" 0
  ${EndIf}
!macroend

Section "Instalare"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File "index.html"
  File "..\build\icon.ico"
  Call GasesteBrowser
  !insertmacro Scurtatura "$DESKTOP\${NUME}.lnk"
  CreateDirectory "$SMPROGRAMS\${NUME}"
  !insertmacro Scurtatura "$SMPROGRAMS\${NUME}\${NUME}.lnk"
  CreateShortCut "$SMPROGRAMS\${NUME}\Dezinstalare.lnk" "$INSTDIR\Dezinstalare.exe"
  WriteUninstaller "$INSTDIR\Dezinstalare.exe"
  WriteRegStr HKCU "${CHEIE}" "DisplayName" "${NUME}"
  WriteRegStr HKCU "${CHEIE}" "DisplayVersion" "${VERSIUNE}"
  WriteRegStr HKCU "${CHEIE}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "${CHEIE}" "UninstallString" '"$INSTDIR\Dezinstalare.exe"'
  WriteRegDWORD HKCU "${CHEIE}" "NoModify" 1
  WriteRegDWORD HKCU "${CHEIE}" "NoRepair" 1
SectionEnd

Function Deschide
  ExecShell "open" "$DESKTOP\${NUME}.lnk"
FunctionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\${NUME}.lnk"
  RMDir /r "$SMPROGRAMS\${NUME}"
  Delete "$INSTDIR\index.html"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\Dezinstalare.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${CHEIE}"
SectionEnd
