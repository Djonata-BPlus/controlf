import { getNonce } from '../utils/utils.js';

export default class GetWebviewSearchContent {
	_html = "";
	_initialProfiles;
	_nonce;
	
	constructor(initialProfiles)
	{
		this._initialProfiles = JSON.stringify(initialProfiles.map(p => ({
			id: p.id,
			nome: p.nome,
			url: p.url,
			usuario: p.usuario,
			senha: ''
		})));
		this._nonce = getNonce()
		this.setupWebView()
	}

	setupWebView()
	{
		this._html = this._html + this.header
		this._html = this._html + this.body
	}

	get html()
	{
		return this._html;
	}
        
	get header()
	{
		return `
		<!DOCTYPE html>
		<html lang="pt-BR">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'nonce-${this._nonce}';">
			<title>Buscar Arquivos</title>
			<style>
				body { font-family: sans-serif; padding: 16px; display: block}
				input, select, button { padding: 5px; margin: 4px 0; box-sizing: border-box; }
				ul { list-style-type: none; padding-left: 0; }
				#div-busca { width: 100%; display: flex; flex-flow: row;}
				.div-busca-campos { width: 100%; display: flex; flex-flow: row;  justify-content: space-between;}
				li { padding: 4px 0; border-bottom: 1px solid #ccc; }
				.checkbox-row { margin-bottom: 8px; }
				.top-bar {width: 100%; display: flex; flex-flow: row;  justify-content: space-between;}
				#configuracoes {margin-left: 10px}
			</style>
		</head>`;
	}

	get body()
	{
		let body = `<body>`
		body = body + this.main
		body = body + this.scripts
		body = body + `</body></html>`;
		return body
	}

	get scripts()
	{
		let scripts = `
			<script nonce="${this._nonce}">
				const vscode = acquireVsCodeApi();
				const input = document.getElementById('busca');
				const lista = document.getElementById('resultados');

				// Recupera estado salvo
				const state = vscode.getState();
				if (state) {
					input.value = state.termo || '';
					lista.innerHTML = state.lista || '';
					document.getElementById('sensitiveCase').checked = state.sensitiveCase || false;
					document.getElementById('tipoDocumento').value = state.tipo || '*.cls';
				}

		`;
		scripts = scripts + this.eventListeners
		scripts = scripts + this.functions
		scripts = scripts+`</script>`;
		return scripts;
	}

	get eventListeners()
	{
		return `
			document.addEventListener("DOMContentLoaded", ()=>{
				loadStoredServes(${this._initialProfiles});
				getNameSpaces()
			});

			document.getElementById("selecionar-servidores").addEventListener("change", ()=>{
				getNameSpaces()
			});

			document.getElementById('botaoBuscar').addEventListener('click', () => {
				const termo = input.value;
				if(!termo) return;

				const sensitiveCase = document.getElementById('sensitiveCase').checked;
				const tipo = document.getElementById('tipoDocumento').value;
				const maxSize = document.getElementById('max-size-qntd').value;
				const servidorId = document.getElementById("selecionar-servidores").value;
				const namespace = document.getElementById("namespaces").value;
				const termoBusca = termo;
				lista.innerHTML = "<li>Carregando...</li>"
				vscode.postMessage({ comando: 'buscar', termo: termoBusca, tipo, sensitiveCase, maxSize, servidorId, namespace });
			});

			document.getElementById('configuracoes').addEventListener('click', () => {
				vscode.postMessage({ comando: 'configuracoes'});
			});

			window.addEventListener('message', event => {
				const message = event.data;
				
				if (message.comando === 'erro') {
					lista.innerHTML = '<li style="color:red;">Erro: ' + message.mensagem + '</li>';
				}
					
				if (message.comando === 'resultado') {
					lista.innerHTML = '';
					const resultados = message.dados?.console || [];

					if (resultados.length === 0) {
						lista.innerHTML = '<li>Nenhum resultado encontrado.</li>';
					} else {
						resultados.forEach(item => {
							const li = document.createElement('li');
							li.textContent = item;
							lista.appendChild(li);
						});
					}

					// Salva o estado da busca
					vscode.setState({
						termo: input.value,
						lista: lista.innerHTML,
						tipo: document.getElementById('tipoDocumento').value,
						sensitiveCase: document.getElementById('sensitiveCase').checked,
						maxSize: document.getElementById('max-size-qntd').value
					});
				} 
				
				if (message.comando === 'getNameSpacesRetorno') {
					let namespaces = ""
					message.data.forEach((namespace)=>{
						namespaces +=  \`
							<option value="\${namespace}">\${namespace}</option>
						\`     
					});
					document.getElementById("namespaces").innerHTML = namespaces
				}

				if (message.comando === 'updateSearchServers') {
					loadStoredServes(message?.data)
				}
			});
		`;
	}
	get functions()
	{
		return `
			function getNameSpaces() {
				const servidorId = document.getElementById("selecionar-servidores").value;
				if(!servidorId) return;
				vscode.postMessage({ comando: 'getNameSpaces', servidorId });
			}

			function loadStoredServes(initialProfilesJson) {		
				const listaServidores = document.getElementById("selecionar-servidores")
				let servidores = ""
				initialProfilesJson.forEach((profile) => {
					servidores = servidores += \`
						<option value="\${profile.id}">\${profile.nome}</option>
					\`;
				});

				listaServidores.innerHTML = servidores
			}
		`;
	}


	get main()
	{
		return `
			<div class="top-bar">
				<h2>Buscar arquivos</h2>
				<div>
					<label for="selecionar-servidores">Selecionar servidor</label>
					<select id="selecionar-servidores"></select>
					<label for="namespaces">Selecionar o Namespace</label>
					<select id="namespaces"></select>
					<button id="configuracoes">Configurações</button>
				</div>
			</div>
			<div >
				<input style="width: 100%" type="text" id="busca" placeholder="Digite algo..." />
				<div id="div-busca">
					<div class="div-busca-campos">
						<div>
							<button id="botaoBuscar">Buscar</button>
						</div>
						
						<div>
							<label for="tipoDocumento">Tipo de documento:</label>
							<select id="tipoDocumento">
								<option value="*.cls">.cls</option>
								<option value="*.*">Todos os tipos</option>
							</select>
							<div class="checkbox-row">
								<label for="sensitiveCase">Match Case</label>
								<input type="checkbox" id="sensitiveCase" />
							</div>
							<div class="max-size">
								<label for="max-size-qntd">Max Num</label>
								<input type="number" id="max-size-qntd" value="200"/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<ul id="resultados"></ul>`;
	}

};