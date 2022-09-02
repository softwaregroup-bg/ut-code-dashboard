import * as vscode from 'vscode';
import { GitExtension } from './@types/vscode.git';

export function activate(context: vscode.ExtensionContext) {
    const commandId = 'ut-code-dashboard.open';
    let disposable = vscode.commands.registerCommand(commandId, () => {
        let folder;
        if (vscode.window.activeTextEditor?.document.uri) {
            folder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor?.document.uri)?.uri.fsPath;
        } else if (vscode.workspace.workspaceFolders?.[0]) {
            folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath
        }
        if (!folder) return;

        const req = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require;
        if (!vscode.workspace.workspaceFolders?.[0]) return '';
        const {name, repository} = folder ? req(folder + '/package.json') : {name: '', repository: {}};
        const type =
            repository?.url?.startsWith('git@github.com:softwaregroup-bg/ut-')
                ? 'github'
                : (repository?.url?.startsWith('git@git.softwaregroup.com:ut5impl/impl-')
                    | repository?.url?.startsWith('git@git.softwaregroup.com:ut5/ut-'))
                    ? 'gitlab'
                    : '';

        const extension = vscode.extensions.getExtension('vscode.git') as vscode.Extension<GitExtension>;
        let branch = extension.exports.getAPI(1).getRepository(vscode.workspace.workspaceFolders?.[0]?.uri)?.state.HEAD?.name || '';


        const panel = vscode.window.createWebviewPanel(
            'ut',
            'UT Module Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'show':
                        vscode.env.openExternal(vscode.Uri.parse(message.text));
                    return;
                }
            },
            undefined,
            context.subscriptions
        );

        panel.webview.html = type ? getWebviewContent({name, type, branch}) : `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>UT Module Dashboard</title>
            </head>
            <body>
                <h1 style="color: red">UNSUPPORTED REPOSITORY URL ${repository?.url}</h1>
            </body>
            </html>	`;
    });

    const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = commandId;
    context.subscriptions.push(myStatusBarItem);
    context.subscriptions.push(disposable);
    myStatusBarItem.text = 'UT';
    myStatusBarItem.name = 'UT Module Dashboard'
    myStatusBarItem.show();
}

declare const __webpack_require__: typeof require;
declare const __non_webpack_require__: typeof require;

function getWebviewContent({name, type, branch}: {name: string, type: string, branch: string}) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UT Project Dashboard</title>
    <script>
        const vscode = acquireVsCodeApi();
        window.addEventListener('message', function (e) {
            vscode.postMessage({command: 'show', text: e.data});
        }, false);
    </script>
    <style>
        body, html {
            margin: 10;
            padding: 0;
            height: 100%;
            overflow: hidden;
        }
        iframe {
            border: 0;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0
        }
    </style>
</head>
<body>
    <iframe width="100%" height="100%" frameborder="0" src="https://redirect.k8s.softwaregroup.com/rpc/tools/module/${name}/${branch}"/>
</body>
</html>`;
}

// this method is called when your extension is deactivated
export function deactivate() { }
