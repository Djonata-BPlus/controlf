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
        this.registerVsCodeEvents()
        this.hasServerConfigs()
    }

    hasServerConfigs()
    {
        if (this._storedServers.length === 0) {
            vscode.window.showWarningMessage('Nenhum servidor de conexão encontrado. Por favor, cadastre ao menos um.');
            vscode.commands.executeCommand('controlf.abrirConfiguracoes');
        }
    }

    registerVsCodeEvents()
    {
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch(message.comando)
            {
                case 'getNameSpaces':
                    this.getNameSpaces(message?.servidorId);
                    break;
                case 'buscar':
                    this.search(message, this._panel, this._context);
                    break;
                case 'configuracoes':
                    vscode.commands.executeCommand('controlf.abrirConfiguracoes');
                    break;
            }
        });
    }

    initWebView()
    {
        this._storedServers = getStoredConfigs();
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
        try
        {
            if (!config?.url) {
                this._panel.webview.postMessage({ comando: 'erro', mensagem: `Credenciais da configuração "${config.nome}" estão incompletas. Verifique as configurações.` });
                return false;
            }
            return true;
        }catch(error)
        {
            vscode.window.showInformationMessage("Erro ao tentar validar o acesso."+ error);
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

    async search(message)
    {
        try {
            //teste para conseguir abrir uma classe apenas clicando com segundo botão, na verdade 
            //se pode dar um clique para abrir onde a busca foi feita, pois ela é uma configuração que
            //está funcionando, e faz sentido abrir onde se esta buscando.
            
            vscode.window.showTextDocument(
                "C:\\Users\\djonata.hortz\\Desktop\\MyProjects\\contolf\\src\\core\\config.js"
            );
            const serverId = message.servidorId;
            this._storedServers = getStoredConfigs();
            if (!this.isValidConfigServer(serverId)) return;
            
            const config = this.getServerConfig(serverId)
            if (!this.isValidAccess(config)) return;

            if (!message?.namespace){
                vscode.window.showInformationMessage("Obrigatório informar o namespace.");
                this._panel.webview.postMessage({ comando: 'getNamespaceError'})
                return;
            }

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
        } catch (erro) 
        {
            this._panel.webview.postMessage({ comando: 'erro', mensagem: `Erro de conexão ou servidor: ${erro.message}, url de teste foi ${url}` });
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
            vscode.window.showInformationMessage("Houve um erro ao buscar os namespaces, verifique as configurações.");
            this._panel.webview.postMessage({ comando: 'getNamespaceError'})
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

    storedServers()
    {
        this._storedServers = getStoredConfigs()
       
    }

}