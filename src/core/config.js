import {getStoredConfigs} from '../utils/utils.js';
import GetWebViewConfigContent from '../web-views/get-webview-server-config.js';
import * as vscode from 'vscode';

export default class Config {
    _command;
    _context;
    _panel;
    _searchRef;

    constructor(context, searchRef)
    {
        this._context = context;
        this._searchRef = searchRef;
        this.registerConfigCommand();
    }

    registerConfigCommand()
    {
        this._command = vscode.commands.registerCommand('controlf.abrirConfiguracoes', async () => {
            this.setupWebView()
        });
    }

    createWebView()
    {
        this._panel = vscode.window.createWebviewPanel(
            'configuracoesControlF',
            'Configurar Servidores (ControlF)',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
    }

    setupWebView()
    {
        this.createWebView();
        this.initWebView();
        this.registerEvents();
    }

    initWebView()
    {
        this._storedServers = getStoredConfigs();
        this._panel.webview.html = new GetWebViewConfigContent(this._storedServers).html;
    }

    registerEvents()
    {
        this._panel.webview.onDidReceiveMessage(async (message) => {
            if (message.comando === 'salvarPerfisArray') this.saveServerConfig(message.perfisArray);
            if (message.comando === 'atualizaListaServidores'){}
        });
    }

    async saveServerConfig(configArray)
    {
       try {
            const configMetaData = [];
            const configRef = vscode.workspace.getConfiguration();
            
            configArray.forEach(async (config)=> {
                const secretKey = `controlf.senha.${config?.id}`;
                if (config.senha && (config.senha.trim() !== '')) await context.secrets.store(secretKey, config.senha);
                configMetaData.push({...config});
            });
            //salvando nas configurações globais do vscode a nova configuração.
            await configRef.update('controlf.perfisConexao', configMetaData, vscode.ConfigurationTarget.Global); 
            vscode.window.showInformationMessage(`Salvos ${configMetaData.length} perfis de conexão.`);
            this._panel.webview.postMessage({ comando: 'status', mensagem: 'Perfis salvos!' });
            this._storedServers = getStoredConfigs()
            this.updateSearchServers()
        } catch (error) {
            vscode.window.showErrorMessage('Erro ao salvar as configurações.');
            this._panel.webview.postMessage({ comando: 'status', mensagem: `Erro: ${error.message}` });
        }
    }

    updateSearchServers()
    {
        this._searchRef.storedServers(this._storedServer);
        vscode.window.showErrorMessage(this._searchRef?.panel?.webview);
        if (this._searchRef?.panel?.webview){
            this._searchRef.panel.webview.postMessage({ comando: 'updateSearchServers', data: this._storedServers});
        }
    }

    get command()
    {
        return this._command;
    }
}
