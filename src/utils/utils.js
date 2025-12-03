import * as vscode from 'vscode';

export function getSavedProfiles() {
    const config = vscode.workspace.getConfiguration();
    return config.get('controlf.perfisConexao') || [];
}