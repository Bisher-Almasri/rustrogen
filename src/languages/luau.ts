/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as monaco from "monaco-editor";

export const conf: monaco.languages.LanguageConfiguration = {
	comments: {
		lineComment: "--",
		blockComment: ["--[[", "]]"]
	},
	brackets: [
		["{", "}"],
		["[", "]"],
		["(", ")"],
		["do", "end"],
		["then", "end"],
		["repeat", "until"],
		["function", "end"]
	],

	indentationRules: {
		increaseIndentPattern:
			/(((else|function|then|do|repeat)((?!(end|until)\\b).)*)|(\\{\\s*))$/,
		decreaseIndentPattern:
			/^\\s*((\\b(elseif|else|end|until)\\b)|(\\})|(\\))\)/
	},
	autoClosingPairs: [
		{ open: "{", close: "}" },
		{ open: "[", close: "]" },
		{ open: "(", close: ")" },
		{ open: '"', close: '"' },
		{ open: "'", close: "'" },
		{ open: "`", close: "`" }
	],
	surroundingPairs: [
		{ open: "{", close: "}" },
		{ open: "[", close: "]" },
		{ open: "(", close: ")" },
		{ open: '"', close: '"' },
		{ open: "'", close: "'" },
		{ open: "do", close: "end" },
		{ open: "then", close: "end" },
		{ open: "if", close: "end" },
		{ open: "for", close: "end" },
		{ open: "function", close: "end" },
		{ open: "`", close: "`" }
	],
	folding: {
		markers: {
			start:
				// new RegExp("^\\s*//\\s*(?:(?:#?region\\b)|(?:<editor-fold\\b))"),
				/^\\s*\/\/\\s*(?:(?:#?region\\b)|(?:<editor-fold\\b))/,
			end:
				// new RegExp("^\\s*//\\s*(?:(?:#?endregion\\b)|(?:</editor-fold>))"),
				/^\\s*\/\/\\s*(?:(?:#?endregion\\b)|(?:<\/editor-fold>))/
		}
	}
};

export const language: monaco.languages.IMonarchLanguage = {
	defaultToken: "",
	tokenPostfix: ".lua",
	keywords:
		"and break continue do else elseif end for function if in local not or repeat return then until while next type".split(
			" "
		),
	constants: "true false nil".split(" "),
	brackets: [
		{ token: "delimiter.bracket", open: "{", close: "}" },
		{ token: "delimiter.array", open: "[", close: "]" },
		{ token: "delimiter.parenthesis", open: "(", close: ")" }
	],
	globals: [
		//#region basic
		"print",
		"error",
		"warn",
		"require",
		"game",
		"assert",
		//#endregion

		//#region raws
		"rawset",
		"rawget",
		"rawequal",
		//#endregion

		//#region libs
		"bit32",
		"math",

		//#region cache
		"cache",
		"cache.invalidate",
		"cache.iscached",
		"cache.replace",

		//#endregion
		// #region debug
		"debug",
		"getupvalue",
		"getconstant",
		"setstack",
		"getproto",
		"getstack",
		"getfunctionname",
		"profilebegin",
		"getprotos",
		"traceback",
		"getconstants",
		"getinfo",
		"setupvalue",
		"setconstant",
		"profileend",
		"getupvalues",
		//#endregion
		//#region string
		"string"
		//#endregion
	],
	operators: [
		"+",
		"-",
		"*",
		"/",
		"%",
		"^",
		"#",
		"=",
		//';', ':', ',', '.', '..', '...', '+=', '-=', '*=', '/=', '..='
		"..",
		"...",
		"+=",
		"-=",
		"*=",
		"/=",
		"..="
	],
	special_operators: ["==", "~=", "<=", ">=", "<", ">", "->"],
	// we include these common regular expressions
	symbols: /[=><!~?:&|+\-*\/\^%\#\.]+/,
	escapes:
		/\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
	digits: /\d+(_+\d+)*/,
	octaldigits: /[0-7]+(_+[0-7]+)*/,
	binarydigits: /[0-1]+(_+[0-1]+)*/,
	hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
	regexpctl: /[(){}\[\]\$\^|\-*+?\.]/,
	regexpesc:
		/\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,
	// The main tokenizer for our languages
	tokenizer: {
		root: [
			// Functions and type annotations:
			[
				/(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*[\.:][a-zA-Z_][a-zA-Z0-9_]*)(\<.+\>)(\())/,
				"",
				"@function_decl"
			],
			[
				/(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*[\.:][a-zA-Z_][a-zA-Z0-9_]*\s*)(\())/,
				"",
				"@function_decl"
			],
			[
				/(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*)(\<.+\>)(\())/,
				"",
				"@function_decl"
			],
			[
				/(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*\s*)(\())/,
				"",
				"@function_decl"
			],
			[
				/(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*\s*)(\())/,
				"",
				"@function_decl"
			],
			[/(?=(function)(\())/, "", "@function_decl"],

			// identifiers and keywords
			[/(?<![^.]\.|:)\b(self)\b/, "variable.language.self"],
			[
				/(?<![^.]\.|:)\b(workspace|game|script|plugin|shared|_G|_VERSION|math\.(pi|huge))\b|(?<![.])\.{3}(?!\.)/,
				"constant.language"
			],
			[
				/(?<![^.]\.|:)\b(assert|collectgarbage|error|getfenv|getmetatable|ipairs|loadstring|next|pairs|pcall|print|rawequal|rawget|rawset|require|select|setfenv|setmetatable|tonumber|tostring|type|unpack|xpcall|typeof|wait|delay|settings|elapsedTime|tick|time|warn|spawn|newproxy|UserSettings)\b(?=\s*(?:[({\"']|\[\[))/,
				"support.function"
			],
			[
				/(?<![^.]\.|:)\b(cache\.(iscached|replace|invalidate))|(coroutine\.(create|resume|running|status|wrap|yield|isyieldable)|string\.(byte|char|dump|find|format|gmatch|gsub|len|lower|match|rep|reverse|sub|upper|split|packsize|pack|unpack)|table\.(concat|insert|maxn|remove|sort|create|find|foreach|foreachi|getn|move|pack|unpack|clear)|math\.(abs|acos|asin|atan2?|ceil|cosh?|deg|exp|floor|fmod|frexp|ldexp|log|log10|max|min|modf|pow|rad|random|randomseed|tointeger|type|ult|noise|clamp|sign|sinh?|sqrt|tanh?|round)|io\.(close|flush|input|lines|open|output|popen|read|tmpfile|type|write)|os\.(clock|date|difftime|execute|exit|getenv|remove|rename|setlocale|time|tmpname)|package\.(cpath|loaded|loadlib|path|preload|seeall)|debug\.(debug|[gs]etfenv|[gs]ethook|getinfo|[gs]etlocal|[gs]etmetatable|getregistry|[gs]etupvalue|traceback|profileend|profilebegin)|utf8\.(char|codes|codepoint|len|offset|graphemes|charpattern|nfcnormalize|nfdnormalize)|bit32\.(arshift|band|bnot|bor|btest|bxor|extract|lrotate|lshift|replace|rrotate|rshift))\b(?=\s*(?:[({\"']|\[\[))/,
				"support.function.library"
			],
			[
				/\b(Axes|BrickColor|CFrame|Color3|ColorSequence|ColorSequenceKeypoint|DateTime|DockWidgetPluginGuiInfo|Faces|Instance|NumberRange|NumberSequence|NumberSequenceKeypoint|PathWaypoint|PhysicalProperties|Random|Ray|RaycastParams|Rect|Region3|Region3int16|TweenInfo|UDim|UDim2|Vector2|Vector2int16|Vector3|Vector3int16|Drawing|Krnl|task)\b/,
				"support.type"
			],
			[/\b(local|type)\b/, "keyword.local"],
			[
				/\b(and|break|continue|do|else|elseif|end|for|function|if|in|local|not|or|repeat|return|then|until|while|next)\b/,
				"keyword"
			],

			[
				/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s*(?:[({\"']|\[\[))/,
				"entity.name.function"
			],
			[/\b([A-Z_][A-Z0-9_]*)\b/, "variable.other.constant"],

			// Enums:
			[
				/(Enum)(\.)(\w*)(\.)(\w*)/,
				[
					"variable.other.enummember.lua",
					"",
					"variable.other.enummember.lua",
					"",
					"variable.other.enummember.lua"
				]
			],
			[
				/(Enum)(\.)(\w*)/,
				[
					"variable.other.enummember.lua",
					"",
					"variable.other.enummember.lua"
				]
			],

			// Type declarations:
			//[/(\bexport\b\s+)(?=(\btype\b\s+)([\w_]+)(<.+>)?(\s*=))/, 'keyword.control.export'],
			//[/(\btype\b\s+)([\w_]+)(<.+>)(\s*=)/, ['storage.type', 'support.type.alias', '', '']],
			//[/(\btype\b\s+)([\w_]+)(\s*=)/, ['storage.type', 'support.type.alias', '']],
			[/(?=\b(export|type)\b\s*[a-zA-Z_])/, "", "@type_decl"],

			[
				/[a-zA-Z_]\w*/,
				{
					cases: {
						"@keywords": { token: "keyword.$0" },
						"@constants": { token: "constants.$0" },
						"@globals": { token: "global" },
						"@default": "identifier"
					}
				}
			],

			// whitespace
			{ include: "@whitespace" },

			// index
			[
				/(?=(\.+[a-zA-Z_][a-zA-Z0-9_]*))(?!(\.+[a-zA-Z_][a-zA-Z0-9_]*)\()/,
				"",
				"@index"
			],

			// keys
			//[/(,)(\s*)([a-zA-Z_]\w*)(\s*)(:)(?!:)/, ['delimiter', '', 'key', '', 'delimiter']],
			//[/({)(\s*)([a-zA-Z_]\w*)(\s*)(:)(?!:)/, ['@brackets', '', 'key', '', 'delimiter']],

			// delimiters and operators
			[/"/, "string", "@string_double"],
			[/'/, "string", "@string_single"],
			[/`/, "string", "@string_backtick"],
			[/\[([=]*)\[/, "delimiter.longstring", "@longstring.$1"], // longstring first
			[/[{}()\[\]]/, "@brackets"],
			//[/\.\./, 'operator'],
			[
				/@symbols/,
				{
					cases: {
						"@operators": "operator",
						"@special_operators": "operator.special",
						"@default": ""
					}
				}
			],
			// numbers
			[/(@digits)[eE]([\-+]?(@digits))?/, "number.float"],
			[/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, "number.float"],
			[/0[xX](@hexdigits)n?/, "number.hex"],
			[/0[oO]?(@octaldigits)n?/, "number.octal"],
			[/0[bB](@binarydigits)n?/, "number.binary"],
			[/(@digits)n?/, "number"],
			// delimiter: after number because of .\d floats
			[/[;,.]/, "delimiter"],
			// strings: recover on non-terminated strings
			[/"([^"\\]|\\.)*$/, "string.invalid"],
			[/'([^'\\]|\\.)*$/, "string.invalid"],
			[/`([^`\\]|\\.)*$/, "string.invalid"]
		],

		regexp: [
			[
				/(\{)(\d+(?:,\d*)?)(\})/,
				[
					"regexp.escape.control",
					"regexp.escape.control",
					"regexp.escape.control"
				]
			],
			[
				/(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/,
				[
					"regexp.escape.control",
					{
						token: "regexp.escape.control",
						next: "@regexrange"
					}
				]
			],
			[
				/(\()(\?:|\?=|\?!)/,
				["regexp.escape.control", "regexp.escape.control"]
			],
			[/[()]/, "regexp.escape.control"],
			[/@regexpctl/, "regexp.escape.control"],
			[/[^\\\/]/, "regexp"],
			[/@regexpesc/, "regexp.escape"],
			[/\\\./, "regexp.invalid"],
			[
				/(\/)([gimsuy]*)/,
				[
					{
						token: "regexp",
						bracket: "@close",
						next: "@pop"
					},
					"keyword.other"
				]
			]
		],

		// Safe symbols:
		index: [
			[/\.[^a-zA-Z_]/, "", "@pop"],
			[/[a-zA-Z_][a-zA-Z0-9_]*/, "variable.property", "@pop"]
		],

		// Tables & type tables:
		type_decl: [
			[/\s*export\s+/, "keyword.control.export"],
			[/\s*type\s+/, "storage.type"],
			[/\b[a-zA-Z_][a-zA-Z0-9_]*\b\s*/, "entity.name.type.alias"],
			[/\</, "punctuation.definition.typeparameters", "@type_group"],
			[/\s*=\s*{/, "@rematch", "@table_type_elements_popall"],
			[/./, "", "@pop"] // Dip if a character is untracked
		],
		table_type_elements_popall: [
			[
				/(\s*=\s*)({)/,
				["keyword.operator", "punctuation.definition.block"]
			], // Consume ' - {' character

			[/"([^"\\]|\\.)*$/, "string.invalid"],
			[/'([^'\\]|\\.)*$/, "string.invalid"],
			[/"/, "string.delimeter", '@string."'],
			[/'/, "string.delimeter", "@string.'"],
			[/`/, "string.delimeter", "@string.`"],

			[/[\[\]]/, "punctuation.definition.block"],
			[/[a-zA-Z_][a-zA-Z0-9_]*/, "variable.object.property"],
			[/{/, "punctuation.definition.block", "@table_type_elements"],

			[/: |\?: /, "keyword.operator.typedef.annotation", "@type_name"],
			[/[,\;]/, "punctuation.separator.table"],

			[/}/, "punctuation.definition.block", "@popall"],
			{ include: "@whitespace" }
		],
		table_type_elements: [
			[/"([^"\\]|\\.)*$/, "string.invalid"],
			[/'([^'\\]|\\.)*$/, "string.invalid"],
			[/"/, "string.delimeter", '@string."'],
			[/'/, "string.delimeter", "@string.'"],
			[/`/, "string.delimeter", "@string.`"],

			[/[\[\]]/, "punctuation.definition.block"],
			[/[a-zA-Z_][a-zA-Z0-9_]*/, "variable.object.property"],
			[/[\<\>]/, "punctuation.definition.typeparameters"],
			[/{/, "punctuation.definition.block", "@table_type_elements"],

			[/: |\?: /, "keyword.operator.typedef.annotation", "@type_name"],
			[/[,\;]/, "punctuation.separator.table"],

			[/}/, "punctuation.definition.block", "@pop"],
			{ include: "@whitespace" }
		],

		// Functions & types:
		function_decl: [
			[/function/, "keyword.control"],
			[
				/(\s+[a-zA-Z_][a-zA-Z0-9_]*)([\.:])([a-zA-Z_][a-zA-Z0-9_]*\s*)/,
				[
					"entity.name.function",
					"punctuation.separator.parameter",
					"entity.name.function"
				]
			],
			[/\s+[a-zA-Z_][a-zA-Z0-9_]*\s*/, "entity.name.function"],
			[/\</, "punctuation.definition.typeparameters", "@type_group"],
			[/\(/, "punctuation.definition.parameters", "@function_params"],
			[/\)/, "punctuation.definition.parameters", "@pop"]
		],
		type_operators: [
			[/(\~|\-\>)/, "operator.type"],
			[/[&|?]/, "punctuation.definition.parameters"],
			[/\.\.\./, "variable.parameter.variadic"]
		],
		type_group: [
			[/[([]/, "punctuation.definition.parameters", "@type_group"],
			[/[{]/, "punctuation.definition.block", "@table_type_elements"], // { exclusive for type tables
			[/[\<]/, "punctuation.definition.typeparameters", "@type_group"],
			[/[a-zA-Z_][a-zA-Z0-9_]*/, "support.type"],
			//[/\.\.\./, 'variable.parameter.variadic'],
			//[/[&|?]/, 'punctuation.definition.parameters'],
			{ include: "@type_operators" },
			[/,/, "punctuation"],
			[/[>]/, "punctuation.definition.typeparameters", "@pop"],
			[/[)\]}]/, "punctuation.definition.parameters", "@pop"]
		],
		type_name: [
			[/\[,/, "punctuation.definition.parameters", "@pop"],
			[
				/(\(|\[[^\,])/,
				"punctuation.definition.parameters",
				"@type_group"
			],
			//[/[\<]/, 'punctuation.definition.typeparameters', '@type_group'],
			[/[{]/, "punctuation.definition.block", "@table_type_elements"], // { exclusive for type tables
			[/[a-zA-Z_][a-zA-Z0-9_]*/, "support.type"],
			//[/\.\.\./, 'variable.parameter.variadic'],
			//[/[&|?]/, 'punctuation.definition.parameters'],
			[/[\<\>]/, "punctuation.definition.typeparameters"],
			//[/->/, 'operator.returns'],
			//[/[>]/, 'punctuation.definition.typeparameters', '@pop'],
			{ include: "@type_operators" },
			[/(?=[)\]},;])/, "punctuation.definition.parameters", "@pop"]
		],
		function_params: [
			[/[([\]]/, "punctuation.definition.parameters"],
			[/\.\.\./, "variable.parameter.variadic"],
			[/[a-zA-Z_][a-zA-Z0-9_]*/, "variable.parameter.function"],
			[/: |\?: /, "keyword.operator.type.annotation", "@type_name"],
			[/,/, "punctuation.separator.arguments"],
			[/(?=\))/, "", "@pop"]
		],

		whitespace: [
			[/[ \t\r\n]+/, ""],
			[/--\[([=]*)\[/, "comment", "@comment.$1"],
			[/--.*$/, "comment"]
		],
		comment: [
			[/(?=(\@\w+)((\[\w+\])?\s*)[\{])/, "", "@comment_highlight"],
			[/(\@)(\w+\s*)/, ["operator", "comment.highlight.descriptor"]],
			[/\t+\# \w.+/, "comment.highlight.title"],
			[
				/\]([=]*)\]/,
				{
					cases: {
						"$1==$S2": { token: "comment", next: "@pop" },
						"@default": "comment"
					}
				}
			],
			[/./, "comment"]
		],
		comment_highlight: [
			[/(\@)(\w+\s*)/, ["operator", "comment.highlight.descriptor"]],
			[
				/(\[)(\w+)(\]\s*)/,
				[
					"comment.delimiter.modifier",
					"comment.highlight.modifier",
					"comment.delimiter.modifier"
				]
			],
			[/\{/, "punctuation.definition.parameters", "@type_group"],
			[/(([^\t]| )[a-z][a-zA-Z0-9_]*)/, "comment.highlight.name", "@pop"],
			[/./, "@rematch", "@pop"]
		],
		longstring: [
			[/[^\]]+/, "longstring"],
			[
				/\]([=]*)\]/,
				{
					cases: {
						"$1==$S2": {
							token: "delimiter.longstring",
							next: "@pop"
						},
						"@default": "delimiter.longstring"
					}
				}
			],
			[/./, "longstring"]
		],
		regexrange: [
			[/-/, "regexp.escape.control"],
			[/\^/, "regexp.invalid"],
			[/@regexpesc/, "regexp.escape"],
			[/[^\]]/, "regexp"],
			[
				/\]/,
				{
					token: "regexp.escape.control",
					next: "@pop",
					bracket: "@close"
				}
			]
		],
		string: [
			[/[^\\"'`]+/, "string"],
			[/@escapes/, "string.escape"],
			[/\\./, "string.escape.invalid"],
			[
				/["'`]/,
				{
					cases: {
						"$#==$S2": {
							token: "string.delimeter",
							next: "@pop"
						},
						"@default": "string"
					}
				}
			]
		],
		string_double: [
			[/[^\\"]+/, "string"],
			[/@escapes/, "string.escape"],
			[/\\./, "string.escape.invalid"],
			[/"/, "string", "@pop"]
		],
		string_single: [
			[/[^\\']+/, "string"],
			[/@escapes/, "string.escape"],
			[/\\./, "string.escape.invalid"],
			[/'/, "string", "@pop"]
		],
		string_backtick: [
			[
				/\{/,
				{
					token: "delimiter.bracket",
					next: "@bracketCounting"
				}
			],
			[/[^\\`\{]+/, "string"],
			[/@escapes/, "string.escape"],
			[/\\./, "string.escape.invalid"],
			[/`/, "string", "@pop"]
		],
		bracketCounting: [
			[/\{/, "delimiter.bracket", "@bracketCounting"],
			[/\}/, "delimiter.bracket", "@pop"],
			{
				include: "root"
			}
		]
	}
};

// const delimiters = [".", ":", "("];
// const kindToDelimiter = {
// Field: ["."],
// Enum: [".", "("],
// EnumMember: ["."],
// Method: [":"],
// Function: ["."],
// Event: ["."],
// Class: ["."]
// };

// function getHierarchy(position: monaco.Position, ignoreParenthesis: boolean) {
//     // Get text before cursor:
//     const line = position.lineNumber;
//     const col = position.column;
//     const text = editor.getModel()!.getValueInRange({
//         startLineNumber: 1,
//         startColumn: 1,
//         endLineNumber: line,
//         endColumn: col
//     });
//     let pos = text.length;

//     // Snap position since arrays start at zero:
//     pos -= 1;

//     // Consumes a word and passes it:
//     function consumeWord() {
//         const word = [];
//         let code = 1;
//         while (text.charAt(pos)) {
//             const char = text.charAt(pos);
//             pos -= 1;
//             if (char.match(/[a-zA-Z0-9_\"]/)) word.push(char);
//             else if (delimiters.includes(char)) {
//                 if (ignoreParenthesis && char == "(") code = 0;
//                 else code = char;
//                 break;
//             } else {
//                 code = 0;
//                 break;
//             }
//         }
//         if (word.length === 0 && typeof code === "number") return [0];
//         return [code, word.reverse().join("")];
//     }

//     // Consume words until stopped:
//     const hierarchy = [];
//     let delimiter;
//     while (true) {
//         const [code, word] = consumeWord();

//         if (word) hierarchy.push(word);

//         // Error
//         if (code == 0) break;
//         // Since it's not success, it's a delimiter
//         else if (code != 1) {
//             hierarchy.push(code);
//             if (!delimiter) delimiter = code;
//         }
//     }

//     return [hierarchy.reverse(), delimiter];
// }

// function getAutocompleteContainerFromName(luaAutocompletes, name) {
//     for (const kind in luaAutocompletes) {
//         const autocompletes = luaAutocompletes[kind];
//         if (autocompletes && autocompletes[name]) {
//             return autocompletes[name];
//         }
//     }
// }

// function getAutocompleteContainerFromHierarchy(
//     luaAutocompletes,
//     hierarchy,
//     delimiter
// ) {
//     let autocompletes = getAutocompleteContainerFromName(
//         luaAutocompletes,
//         hierarchy[0]
//     );

//     if (!autocompletes) return;

//     for (let index = 1; index < hierarchy.length; index++) {
//         const key = hierarchy[index];
//         const child = getAutocompleteContainerFromName(
//             autocompletes.__children__,
//             key
//         );
//         if (child) autocompletes = child;
//         else if (delimiter && index == hierarchy.length - 1) break;
//         else if (!delimiters.includes(key)) return;
//     }

//     return autocompletes;
// }

// function RemoveAutocompletes(scope) {
//     const proposals = GetProposals();
//     for (let index = proposals.length - 1; index >= 0; --index) {
//         const autocomplete = proposals[index];
//         if (autocomplete.__scope__ == scope) proposals.splice(index, 1);
//     }
// }

// function AddAutocompletes(autocompleteContainer, scope, delimiter) {
//     for (const kind in autocompleteContainer) {
//         const autocompletes = autocompleteContainer[kind];

//         if (
//             typeof autocompletes === "undefined" ||
//             (delimiter &&
//                 kindToDelimiter[kind] &&
//                 !kindToDelimiter[kind].includes(delimiter))
//         )
//             continue;

//         if (autocompletes[0]) {
//             for (const name of Object.values(autocompletes))
//                 AddSnippet(kind, name, { __scope__: scope });

//             continue;
//         }

//         for (const name in autocompletes) {
//             const data = autocompletes[name];
//             data.__scope__ = scope;
//             AddSnippet(kind, name, data);
//         }
//     }
// }
    