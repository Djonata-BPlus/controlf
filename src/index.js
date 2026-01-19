import Search from './core/search.js';
import Config from './core/config.js';

export function activate(context) {
    // Registra os dois comandos
    const search =  new Search(context)
    const disposableBusca = search.command;
    const config = new Config(context, search)
    const disposableConfig = config.command;

    // Adiciona ambos os comandos às subscriptions
    context.subscriptions.push(disposableConfig);
    context.subscriptions.push(disposableBusca);
}

export function deactivate() {}