; ============================================================================
;  Elements Launcher — script NSIS customizado (incluído via build.nsis.include)
;  Quando o LAUNCHER é desinstalado, remove também os aplicativos que foram
;  instalados por ele (InstaSave e ConvertMp3), usando os desinstaladores
;  oficiais. Nada é removido se os apps não existirem.
;
;  - InstaSave (por usuário, asInvoker): desinstalação silenciosa (/S).
;  - ConvertMp3 (máquina, RequireAdministrator): via PowerShell
;    Start-Process -Verb RunAs -Wait → UMA confirmação UAC; se o usuário
;    cancelar, a desinstalação do launcher continua normalmente.
;
;  Registradores: $R8 = caminho do desinstalador, $R7 = código de saída.
; ============================================================================

!macro customUnInstall
  ${ifNot} ${isUpdated}
    DetailPrint "Elements Launcher: removendo aplicativos instalados pelo launcher..."

    ; ---------------------------------------------------------------
    ; InstaSave — instalação por usuário (%LOCALAPPDATA%\Programs)
    ; ---------------------------------------------------------------
    StrCpy $R8 "$LOCALAPPDATA\Programs\InstaSave\Uninstall InstaSave.exe"
    IfFileExists $R8 0 LauncherSkipInstaSave
      DetailPrint "Elements Launcher: desinstalando InstaSave (silencioso)..."
      ExecWait '"$R8" /S' $R7
      DetailPrint "Elements Launcher: InstaSave desinstalado (exit=$R7)"
    LauncherSkipInstaSave:

    ; ---------------------------------------------------------------
    ; ConvertMp3 — instalação de máquina (C:\Program Files)
    ; ---------------------------------------------------------------
    StrCpy $R8 "$PROGRAMFILES64\ConvertMp3\Uninstall ConvertMp3.exe"
    IfFileExists $R8 0 LauncherSkipConvertMp3
      DetailPrint "Elements Launcher: ConvertMp3 pedirá sua confirmação (UAC) para ser removido..."
      nsExec::Exec `powershell.exe -NoProfile -NonInteractive -Command "$$p = Start-Process -FilePath '$R8' -ArgumentList '/S' -Verb RunAs -Wait -PassThru; exit $$p.ExitCode"`
      Pop $R7
      DetailPrint "Elements Launcher: ConvertMp3 removido (exit=$R7 ou UAC cancelado)"
    LauncherSkipConvertMp3:

    DetailPrint "Elements Launcher: limpeza de aplicativos concluída"
  ${endIf}
!macroend
