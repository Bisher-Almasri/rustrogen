import * as monaco from "monaco-editor";
// Import the completion provider along with conf and language
import { conf, language, luauCompletionProvider } from "./luau";

export function init() {
	monaco.languages.register({
		id: "luau",
		aliases: ["luau", "lua", "RLua"],
		extensions: [".lua", ".luau", ".rbxs"],
		mimetypes: ["text/x-luau"]
	});

	monaco.languages.setLanguageConfiguration("luau", conf);
	monaco.languages.setMonarchTokensProvider("luau", language);
	// Register the completion item provider
	monaco.languages.registerCompletionItemProvider("luau", luauCompletionProvider);
}
    