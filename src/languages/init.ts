import * as monaco from "monaco-editor";
import { conf, language } from "./luau";
export function init() {
	monaco.languages.register({
		id: "luau",
		aliases: ["luau", "lua", "RLua"],
		extensions: [".lua", ".luau", ".rbxs"],
		mimetypes: ["text/x-luau"]
	});

	monaco.languages.setLanguageConfiguration("luau", conf);
	monaco.languages.setMonarchTokensProvider("luau", language);
}
    