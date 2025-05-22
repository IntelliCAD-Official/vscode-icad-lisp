# IntelliCAD® Lisp Debugger

This extension adds support for IntelliCAD Lisp source (.lsp) files to Microsoft® Visual Studio Code. It allows you to edit and debug Lisp programs with IntelliCAD 14.0 and later.

The extension is open source and distributed under [Apache License v2.0](licence.md). See [NOTICE.md](NOTICE.md) for complete details, including software and third-party licenses and permissions.

If you have feedback, please create an issue [here](https://github.com/IntelliCAD-Official/vscode-icad-lisp/issues).

## Debugger Tools
* Attach to IntelliCAD for live AutoLISP debugging
* View and interact via the debug console
* Set breakpoints, step in/out/over, and pause on errors
* Inspect variables and trace the call stack
* Load the active file into IntelliCAD directly from the editor

## Editor Features
* Syntax highlighting and smart autocompletion
* Snippets, bracket matching, and auto-indentation
* Format code using narrow or wide style options
* Context-aware links to online documentation
* Jump to definitions and insert code regions
* Auto-generate function docs and rename symbols
* Find references and see quick info on hover
* Use @Global tags to support workspace-aware tools

## Install IntelliCAD Lisp Debugger
1. Install IntelliCAD 14.0 or later.
2. Start Visual Studio Code. Note that if you launch IntelliCAD as an administrator, start Visual Studio Code as an administrator too.
3. In Visual Studio Code, do one of the following:
    * Click Extensions on the left, search for IntelliCAD Lisp Debugger, and click Install.
    * Choose View > Command Palette (Ctrl+Shift+P), and enter the following: ```ext install intellicad.icad-lisp```

## Set up IntelliCAD Lisp Debugger
For OEM-based IntelliCAD products, your IntelliCAD product might not be icad.exe. To use IntelliCAD Lisp Debugger with your product, in Extensions, set the Launch Program to your product .exe filename.

Also consider setting the path to prevent specifying it each time you run the debugger.
To set the path:
1.  In Visual Studio Code, click Extensions on the left.
2.  Click the Settings icon for IntelliCAD Lisp Debugger.
3.  On the User tab, do the following:
     * Debug: Attach Process – Enter the process name in which to filter during Debug Attach.
     * Debug: Launch Parameters – Enter the IntelliCAD startup parameters.
     * Debug: Launch Program – Enter the path of the IntelliCAD executable to use with Debug Launch.

### Examples
* Launch Program: C:\Program Files\ITC\IntelliCAD &lt;14.0&gt; Professional\Icad.exe
* Attach Process: icad

Where the path is the location of the IntelliCAD application installed on your computer.

## Debug a Lisp source file
1.  Open a folder that contains your Lisp source (.lsp) files or open a Lisp project file.
2.  Open an .lsp file.
2.  Choose ... > Run > Start Debugging (F5).
3.  Choose one of the following debug configurations:
     * IntelliCAD Lisp Debug: Attach – Attaches a running instance of the IntelliCAD application to debug the current .lsp file.
     * IntelliCAD Lisp Debug: Launch – Launches a new instance of the IntelliCAD application to debug the current .lsp file.
4.  If prompted, specify the absolute path to the IntelliCAD executable file. 

If you cannot set a breakpoint in an .lsp file or use the launch/attach debug configurations, disable or uninstall all other Lisp extensions, which can cause conflicts.

## Legal
IntelliCAD® Lisp Debugger © 2025 The IntelliCAD Technology Consortium. All rights reserved.

See [The IntelliCAD Technology Consortium Privacy Policy](https://www.intellicad.org/privacy-policy) for details about the privacy policy of the The IntelliCAD Technology Consortium.

IntelliCAD and the IntelliCAD logo are either registered trademarks or trademarks of The IntelliCAD Technology Consortium in the United States and/or other countries. All other trademarks are property of the respective owners.
