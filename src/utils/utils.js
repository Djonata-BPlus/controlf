import * as vscode from 'vscode';

export function getStoredConfigs() {
    const config = vscode.workspace.getConfiguration();
    return config.get('controlf.perfisConexao') || [];
}

/**
 * nonce é um identificador único que deve ser adicionado aos script carregados por webviews, vscode CSP ref: https://code.visualstudio.com/updates/v1_38
**/
export function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
