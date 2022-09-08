import * as vscode from 'vscode';
import { GitExtension } from './@types/vscode.git';

function openDashboard(folder: vscode.Uri, context: vscode.ExtensionContext) {
    const req = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require;
    const {name, repository} = folder ? req(folder.fsPath + '/package.json') : {name: '', repository: {}};
    const type =
        repository?.url?.startsWith('git@github.com:softwaregroup-bg/ut-')
            ? 'github'
            : (repository?.url?.startsWith('git@git.softwaregroup.com:ut5impl/impl-')
                | repository?.url?.startsWith('git@git.softwaregroup.com:ut5/ut-'))
                ? 'gitlab'
                : '';

    const extension = vscode.extensions.getExtension('vscode.git') as vscode.Extension<GitExtension>;
    let branch = extension.exports.getAPI(1).getRepository(folder)?.state.HEAD?.name || '';


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
}

export function activate(context: vscode.ExtensionContext) {
    const openCurrentCommand = 'ut-code-dashboard.open';
    const openCurrentHandler = () => {
        let folder;
        if (vscode.window.activeTextEditor?.document.uri) {
            folder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor?.document.uri)?.uri;
        } else if (vscode.workspace?.workspaceFolders?.length) {
            openSelectHandler();
            return;
        } else if (vscode.workspace.workspaceFolders?.[0]) {
            folder = vscode.workspace.workspaceFolders?.[0].uri
        }
        if (!folder) return;
        openDashboard(folder, context);
    }

    const openSelectHandler = () => {
        if (vscode.workspace?.workspaceFolders?.length === 1) return openCurrentHandler();
        if (vscode.workspace?.workspaceFolders?.length) {
            vscode.window.showQuickPick(
                vscode.workspace?.workspaceFolders.map(({name}) => name),
                {canPickMany: false, title: 'Select module'}
            ).then(selected => {
                const found = vscode.workspace?.workspaceFolders?.find(item => item.name === selected);
                if (found) openDashboard(found.uri, context)
            });
        }
    }

    const openCurrent = vscode.commands.registerCommand(openCurrentCommand, openCurrentHandler);
    const openSelectCommand = 'ut-code-dashboard.select';
    const openSelect = vscode.commands.registerCommand(openSelectCommand, openSelectHandler);

    const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = openSelectCommand;
    context.subscriptions.push(myStatusBarItem);
    context.subscriptions.push(openCurrent);
    context.subscriptions.push(openSelect);
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
    <iframe width="100%" height="100%" frameborder="0" src="https://redirect.k8s.softwaregroup.com/rpc/tools/module/${type}/${name}/${branch}"/>
</body>
</html>`;
}

// this method is called when your extension is deactivated
export function deactivate() { }
