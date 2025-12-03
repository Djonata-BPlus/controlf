import { getNonce } from "../utils/utils.js";

export default function getWebviewConfigContent(initialProfiles = []) {
    const nonce = getNonce();

    const initialProfilesJson = JSON.stringify(initialProfiles.map(p => ({
        id: p.id,
        nome: p.nome,
        url: p.url,
        usuario: p.usuario,
        senha: ''
    })));

    return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Configurações de Servidores</title>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <style>
            /* Estilos básicos para o VS Code */
            body, button, input { font-family: var(--vscode-font-family); color: var(--vscode-foreground); }
            .profile-card { 
                border: 1px solid var(--vscode-editorGroup-border); 
                padding: 15px; 
                margin-bottom: 10px; 
                border-radius: 5px; 
                background-color: var(--vscode-editor-background);
            }
            .profile-card h3 { margin-top: 0; border-bottom: 1px solid var(--vscode-input-border); padding-bottom: 5px; }
            .field-group { margin-bottom: 8px; }
            .field-group label { display: block; margin-bottom: 3px; font-weight: bold; font-size: 0.9em; }
            .field-group input { 
                width: 90%; 
                padding: 5px; 
                border: 1px solid var(--vscode-input-border); 
                background-color: var(--vscode-input-background); 
                color: var(--vscode-input-foreground); 
            }
            .button-group { margin-top: 10px; }
            #save-all-btn, #add-profile-btn { 
                background-color: var(--vscode-button-background); 
                color: var(--vscode-button-foreground); 
                border: none; 
                padding: 10px 15px; 
                cursor: pointer; 
                margin-right: 10px;
            }
            #save-all-btn:hover, #add-profile-btn:hover { background-color: var(--vscode-button-hoverBackground); }
            button[data-action="remove"] { 
                background-color: var(--vscode-statusBarItem-errorBackground); 
                color: var(--vscode-statusBarItem-errorForeground); 
                border: none;
                padding: 8px 12px;
            }
        </style>
    </head>
    <body>
        <h1>Configuração de Servidores</h1>

        <div id="profiles-container">
            </div>

        <button id="add-profile-btn">Adicionar Novo Servidor</button>
        <button id="save-all-btn">Salvar Todas as Configurações</button>

        <p id="status-message" style="color: var(--vscode-terminal-ansiBrightYellow); margin-top: 10px;"></p>

        <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            // Variável global no frontend para gerenciar a lista de perfis
            let profiles = ${initialProfilesJson};

            document.addEventListener('DOMContentLoaded', () => {
                renderProfiles();
                
                document.getElementById('add-profile-btn').addEventListener('click', () => {
                    addNewProfile();
                });
                
                document.getElementById('save-all-btn').addEventListener('click', () => {
                    saveAllProfiles();
                });

                // Handler para receber feedback do index
                window.addEventListener('message', event => {
                    const message = event.data;
                    const statusEl = document.getElementById('status-message');
                    if (message.comando === 'status') {
                        statusEl.textContent = 'Status: ' + message.mensagem;
                        setTimeout(() => statusEl.textContent = '', 5000);
                    }
                });
            });

            // Gerador de ID único simples
            function generateUniqueId() {
                return 'controlf-id-' + Math.random().toString(36).substring(2, 9);
            }

            // Adiciona um novo perfil à lista
            function addNewProfile() {
                const newProfile = {
                    id: generateUniqueId(),
                    nome: 'Novo Servidor',
                    url: 'http://',
                    usuario: '',
                    senha: ''
                };
                profiles.push(newProfile);
                renderProfiles();
            }

            // Remove um perfil da lista
            function removeProfile(id) {
                profiles = profiles.filter(p => p.id !== id);
                renderProfiles();
            }

            // Renderiza toda a lista de cards de perfil
            function renderProfiles() {
                const container = document.getElementById('profiles-container');
                container.innerHTML = ''; 

                if (profiles.length === 0) {
                    container.innerHTML = '<p>Nenhum servidor configurado. Adicione um para começar.</p>';
                }

                profiles.forEach((p) => {
                    const card = document.createElement('div');
                    card.className = 'profile-card';
                    card.innerHTML = \`
                        <h3 id="card-title-\${p.id}">\${p.nome || 'Novo Servidor'}</h3>
                        
                        <div class="field-group">
                            <label for="nome-\${p.id}">Nome do Servidor (Ex: Homologação)</label>
                            <input id="nome-\${p.id}" type="text" value="\${p.nome}" data-id="\${p.id}" data-field="nome">
                        </div>
                        <div class="field-group">
                            <label for="url-\${p.id}">URL Base (Ex: http://ip:porta)</label>
                            <input id="url-\${p.id}" type="url" value="\${p.url}" data-id="\${p.id}" data-field="url">
                        </div>
                        <div class="field-group">
                            <label for="usuario-\${p.id}">Usuário</label>
                            <input id="usuario-\${p.id}" type="text" value="\${p.usuario}" data-id="\${p.id}" data-field="usuario">
                        </div>
                        <div class="field-group">
                            <label for="senha-\${p.id}">Senha</label>
                            <input id="senha-\${p.id}" type="password" value="" data-id="\${p.id}" data-field="senha" placeholder="Deixe em branco para manter a senha salva">
                        </div>
                        <div class="button-group">
                            <button data-id="\${p.id}" data-action="remove">Remover Perfil</button>
                        </div>
                    \`;
                    container.appendChild(card);
                });

                // Adiciona listeners para atualizar o modelo de dados ao digitar
                container.querySelectorAll('input').forEach(input => {
                    input.addEventListener('input', updateProfileModel);
                });
                container.querySelectorAll('button[data-action="remove"]').forEach(button => {
                    button.addEventListener('click', (e) => removeProfile(e.target.dataset.id));
                });
            }

            // Atualiza o modelo 'profiles' no JavaScript do frontend
            function updateProfileModel(event) {
                const id = event.target.dataset.id;
                const field = event.target.dataset.field;
                const value = event.target.value;
                
                const profile = profiles.find(p => p.id === id);
                if (profile && field !== 'senha') { 
                    // Metadados são salvos no modelo JS
                    profile[field] = value;
                    
                    // Atualiza o título do card dinamicamente
                    if (field === 'nome') {
                        document.getElementById(\`card-title-\${id}\`).textContent = value;
                    }
                }
                // Nota: O campo 'senha' não é salvo no modelo JS aqui; ele é lido diretamente
                // do input no momento do 'Salvar' para garantir que não fique em memória do frontend.
            }
            
            // Envia a lista completa de perfis para o backend (extension.js)
            function saveAllProfiles() {
                const profilesToSend = profiles.map(p => {
                    // Recupera o valor atual do campo de senha (se preenchido)
                    const senhaInput = document.getElementById(\`senha-\${p.id}\`);
                    
                    return {
                        id: p.id,
                        nome: p.nome,
                        url: p.url,
                        usuario: p.usuario,
                        senha: senhaInput ? senhaInput.value : '' 
                    };
                });
                
                // Comunica com o backend, que fará o salvamento no settings.json e SecretStorage
                vscode.postMessage({
                    comando: 'salvarPerfisArray',
                    perfisArray: profilesToSend
                });
            }
        </script>
    </body>
    </html>
    `;
};