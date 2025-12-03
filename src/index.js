import * as vscode from 'vscode';
import Search from './core/search.js';
import getWebviewConfigContent from './web-views/get-webview-server-config.js';
import {getSavedProfiles} from './utils/utils.js';


function registerConfigCommand(context) {
    return vscode.commands.registerCommand('controlf.abrirConfiguracoes', async () => {
        
        const panel = vscode.window.createWebviewPanel(
            'configuracoesControlF',
            'Configurar Servidores (ControlF)',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const perfisSalvos = getSavedProfiles();

        panel.webview.html = getWebviewConfigContent(perfisSalvos);

        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.comando === 'salvarPerfisArray') {
                const perfisArray = message.perfisArray; 
                const perfisMetaData = [];
                const config = vscode.workspace.getConfiguration();
                
                try {
                    for (const perfil of perfisArray) {
                        if (perfil.senha && perfil.senha.trim() !== '') {
                            const secretKey = `controlf.senha.${perfil.id}`;
                            await context.secrets.store(secretKey, perfil.senha);
                        }
                        
                       
                        perfisMetaData.push({
                            id: perfil.id,
                            nome: perfil.nome,
                            url: perfil.url,
                            usuario: perfil.usuario
                        });
                    }

                    await config.update('controlf.perfisConexao', perfisMetaData, vscode.ConfigurationTarget.Global);
                    
                    vscode.window.showInformationMessage(`Salvos ${perfisMetaData.length} perfis de conexão.`);
                    panel.webview.postMessage({ comando: 'status', mensagem: 'Perfis salvos!' });
                    panel.webview.postMessage({ comando: 'rechargeNamespaces'});
                    console.log("chamou recarregar namespaces")
                } catch (error) {
                    vscode.window.showErrorMessage('Erro ao salvar as configurações.');
                    console.error('Erro ao salvar perfis:', error);
                    panel.webview.postMessage({ comando: 'status', mensagem: `Erro: ${error.message}` });
                }
            }
            if (message.comando === 'atualizaListaServidores'){
                
            }
        });
    });
}



export function activate(context) {
    // Registra os dois comandos
    const disposableConfig = registerConfigCommand(context);
    const command =  new Search(context).command
    const disposableBusca = command;

    // Adiciona ambos os comandos às subscriptions
    context.subscriptions.push(disposableConfig);
    context.subscriptions.push(disposableBusca);
}

export function deactivate() {}