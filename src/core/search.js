import * as vscode from 'vscode';
import GetWebviewContent from '../web-views/get-webview-search.js';
import {getStoredConfigs} from '../utils/utils.js';

export default class Search {
    _context;
    _command;
    _panel;
    _storedServers;

    constructor(context)
    {
        this._context = context;
        this.registerSearchCommand()
    }

    setupWebView()
    {
        this.createWebView()
        this.initWebView()
        this.registerEvents()
    }

    registerEvents()
    {
        this._panel.webview.onDidReceiveMessage(async (message) => {
            if (message.comando === 'getNameSpaces') this.getNameSpaces(message?.servidorId);
            if (message.comando === 'buscar') this.buscar(message, this._panel, this._context);
            if (message.comando === 'configuracoes') vscode.commands.executeCommand('controlf.abrirConfiguracoes');
        });
    }

    initWebView()
    {
        this._storedServers = getStoredConfigs();
        if (this._storedServers.length === 0) {
            vscode.window.showWarningMessage('Nenhum servidor de conexão encontrado. Por favor, cadastre um servidor.');
            return vscode.commands.executeCommand('controlf.abrirConfiguracoes');
        }
        vscode.window.showInformationMessage('Abrindo tela de busca...');
        this._panel.webview.html = new GetWebviewContent(this._storedServers).html;
    }

    createWebView()
    {
        this._panel = vscode.window.createWebviewPanel(
            'buscadorArquivos',
            'Buscar Arquivos',
            vscode.ViewColumn.One,
            {enableScripts: true, retainContextWhenHidden: true}
        );
    }

    registerSearchCommand()
    {
        this._command = vscode.commands.registerCommand("controlf.abrirTela", () => {
            this.setupWebView()
        });
    }

    getServerConfig(serverId)
    {
        if(!this._storedServers){
            this._panel.webview.postMessage({ comando: 'erro', mensagem: 'Erro ao recuperar configuração'});
            return;
        }
        const serverConfig = this._storedServers.find(p => p.id === serverId);
        return serverConfig;
    }

    isValidConfigServer(serverId)
    {
        if (!serverId) {
            this._panel.webview.postMessage({ comando: 'erro', mensagem: 'Selecione um servidor de conexão para buscar.'+serverId });
            return false;
        }
    
        const config =  this.getServerConfig(serverId)
        if (!config) {
            this._panel.webview.postMessage({ comando: 'erro', mensagem: `Configuração não encontrada.` });
            return false;
        }

        if (!config?.id) {
            this._panel.webview.postMessage({ comando: 'erro', mensagem: 'ID da configuração não encontrado' });
            return false;
        }

        if (!config?.url) {
            this._panel.webview.postMessage({ comando: 'erro', mensagem: 'URL da configuração não encontrada' });
            return false;
        }
        return true;
    }

    async getPassword(configId)
    {
        return await this._context.secrets.get(`controlf.senha.${configId}`); 
    }

    async isValidAccess(config)
    {
        const password = await this.getPassword(config.id);
        if (!config?.url || (!config?.usuario) || (!password)) {
            this._panel.webview.postMessage({ comando: 'erro', mensagem: `Credenciais da configuração "${config.nome}" estão incompletas. Verifique as configurações.` });
            return;
        }

    }

    async getSearchURL(message, baseUrl)
    {
        const params = {
            namespace: encodeURIComponent(message.namespace),
            tipoArquivo: (message.tipo || '*.cls'),
            sensitiveCase: (message.sensitiveCase ? 1 : 0),
            searchInGenFilesToo: (message.tipo === "*.*" ? 1 : 0), //Para buscar em todos os tipos é preciso deixar como 1.
            maxSize: (message.maxSize || 200),
            stringBusca: encodeURIComponent(message.termo)
        }
        return `${baseUrl}/api/atelier/v2/${params.namespace}/action/search?query=${params.stringBusca}&documents=${encodeURIComponent(params.tipoArquivo)}&case=${params.sensitiveCase}&regex=0&gen=${params.searchInGenFilesToo}&max=${params.maxSize}`;
    }

    async buscar(message)
    {
        try {
            const serverId = message.servidorId;
            this._storedServers = getStoredConfigs();
            if (!this.isValidConfigServer(serverId)) return;
            
            const config = this.getServerConfig(serverId)
            if (!this.isValidAccess(config)) return;

            const url = await this.getSearchURL(message, config.url);
            const password = await this.getPassword(config?.id);
            const base64Credentials = Buffer.from(`${config.usuario}:${password}`).toString('base64');
        
            const resposta = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${base64Credentials}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!resposta.ok) {
                const erroTexto = await resposta.text();
                throw new Error(`Erro HTTP ${resposta.status}: ${erroTexto.substring(0, 100)}...`);
            }

            const dados = await resposta.json();
            this._panel.webview.postMessage({ comando: 'resultado', dados });
        } catch (erro) {
            this._panel.webview.postMessage({ comando: 'erro', mensagem: `Erro de conexão ou servidor: ${erro.message}` });
        }
    }

    async getNameSpaces(servidorId)
    {
        try {        
            if (!servidorId) {
                this._panel.webview.postMessage({ comando: 'erro', mensagem: 'Selecione um servidor de conexão para buscar.' });
                return;
            }
            const config = this.getServerConfig(servidorId);
            
            if(!this.isValidConfigServer(servidorId)) return;
            
            const password = await this.getPassword(config?.id);
            const base64Credentials = Buffer.from(`${config.usuario}:${password}`).toString('base64');
            
            const resposta = await fetch(config?.url+"/api/atelier/", {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${base64Credentials}`,
                    'Content-Type': 'application/json',
                },
            });
            
            const dados = await resposta.json();
            this._panel.webview.postMessage({ comando: 'getNameSpacesRetorno', data: dados?.result?.content?.namespaces });
        } catch (error) {
            vscode.window.showInformationMessage("Houve um erro ao buscar os namespaces");
        }
    }
    
    get command()
    {
        return this._command;
    }
    
    get panel()
    {
        return this._panel;
    }

    storedServers(storedServers)
    {
        this._storedServers = storedServers
    }

}