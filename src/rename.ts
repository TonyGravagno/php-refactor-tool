import * as path from 'path';
import {
	Position,
	RenameProvider,
	TextDocument,
	WorkspaceEdit,
	SymbolKind, 
	LocationLink, 
	Location, 
	Uri, DocumentSymbol, Range, window,
    workspace
} from 'vscode';
import { getDocumentSymbols, getReferences, getSymbol } from './api';
import { isNone } from 'fp-ts/lib/Option';
import * as utils from './utils/utils';

const DEFAULT_VENDOR_DIR = 'vendor';

const CANNOT_RENAME_ERROR_MESSAGE = 'You can not rename this symbol';
const CANNOT_RENAME_FROM_VENDOR_ERROR_MESSAGE = 'You can not rename the symbols from vendor';
const METHOD_NAME_DUPLICATION_ERROR_MESSAGE = 'Method name conflicts.';

const UPDATE_GETTER_AND_SETTER = 'Update getter name and setter name.';
const RENAME_PROPERTY_ONLY = 'Rename the property only.';

export class PhpRenameProvider implements RenameProvider {

	public async provideRenameEdits(
		document: TextDocument,
		position: Position,
		newName: string
	): Promise<WorkspaceEdit|null> {

		const oldName = document.getText(document.getWordRangeAtPosition(position));

		const targets = await getReferences(document.uri, position);

		if (targets.length === 0) {
			throw new Error(CANNOT_RENAME_ERROR_MESSAGE);
		}

		const result = await getSymbol(document.uri, position);
		if (!isNone(result)) {
			const [sym, def] = result.value;
			if (this.isFromVendor(def.targetUri)) {
				throw new Error(CANNOT_RENAME_FROM_VENDOR_ERROR_MESSAGE);
			}
		}

		const edit = new WorkspaceEdit();

		const symbols = await getDocumentSymbols(document.uri);

		let isGetterSetterUpdated = false;

		// TODO refactor this mess ^^
		for (const location of targets) {
			if (!isNone(result)) {
				const [sym, def] = result.value;

				if (sym.kind === SymbolKind.Property) {
					if (!isGetterSetterUpdated) {
						await window.showQuickPick([
							UPDATE_GETTER_AND_SETTER,
							RENAME_PROPERTY_ONLY
						]).then( async (answer) => {
							if (answer === UPDATE_GETTER_AND_SETTER) {
								await this.updateGetterAndSetter(document, location, newName, edit, symbols);
							}
						});
						isGetterSetterUpdated = true;
					}
					this.renameProperty(document, location, newName, edit);
				} else if (sym.kind === SymbolKind.Class
					|| sym.kind === SymbolKind.Interface
					|| sym.kind === SymbolKind.Module
				) {
					edit.replace(
						location.uri, 
						location.range.with(location.range.end.translate(0, -oldName.length)), 
						newName
					);
				} else {
					edit.replace(location.uri, location.range, newName);
				}
			} else {
				edit.replace(location.uri, location.range, newName);
			}
		}

		if (!isNone(result)) {
			const [sym, def] = result.value;			
			if (sym.kind === SymbolKind.Class
				|| sym.kind === SymbolKind.Interface
				|| sym.kind === SymbolKind.Module) {
				this.renameFile(edit, def, newName);
			}
		}

		return edit;
	}

	private renameProperty(document: TextDocument, location: Location, newName: string, edit: WorkspaceEdit): void {
		const actualName = document.getText(location.range);
		const normalizedNewName = newName.replace(/^\$/, '');

		edit.replace(
			location.uri,
			location.range,
			actualName.includes('$') ? `$${normalizedNewName}` : normalizedNewName
		);
	}

	private renameFile(edit: WorkspaceEdit, definition: LocationLink, newName: string): void {
		const preferredName = this.getPhpFileNameForSymbol(
			newName,
			definition.targetUri
		);
		const newPath = path.format({
			dir: path.dirname(definition.targetUri.path),
			name: preferredName,
			ext: '.php'
		});
		edit.renameFile(definition.targetUri, definition.targetUri.with({ path: newPath }));				
	}

	private isFromVendor(uri: Uri): boolean {
		return uri.path.includes(DEFAULT_VENDOR_DIR);
	}

	private async updateGetterAndSetter(document: TextDocument, location: Location, newName: string, edit: WorkspaceEdit, symbols: DocumentSymbol[]): Promise<void> {
		const actualName = document.getText(location.range);
		const [actualGetterName, actualSetterName]  = this.getGetterSetterName(actualName);
		const [newGetterName, newSetterName] = this.getGetterSetterName(newName);


		for (const symbol of symbols) {
			if (symbol.children.length === 0) {
				continue;
			}

			for (const child of symbol.children) {		
				if (child.name === newGetterName || child.name === newSetterName) {
					throw new Error(METHOD_NAME_DUPLICATION_ERROR_MESSAGE);
				}

				if (!this.isRangeInTextEdits(document, edit, child.selectionRange) && child.name === actualGetterName) {
					await this.renameAllReferences(document, child, edit, newGetterName);
				} else if (!this.isRangeInTextEdits(document, edit, child.selectionRange) && child.name === actualSetterName) {
					await this.renameAllReferences(document, child, edit, newSetterName);
				}
			}
		}
	}

	private getGetterSetterName(actualName: string): string[] {
		const normalizedName = actualName.replace(/^\$/, '');
		const getterName = 'get' + utils.upperCaseFirst(normalizedName);
		const setterName = 'set' + utils.upperCaseFirst(normalizedName);
		return [getterName, setterName];
	}

	private async renameAllReferences(document: TextDocument, child: DocumentSymbol, edit: WorkspaceEdit, newSetterName: string): Promise<void> {
		const targetMethods = await getReferences(document.uri, child.selectionRange.end);
		for (const targetMethod of targetMethods) {
			edit.replace(targetMethod.uri, targetMethod.range, newSetterName);
		}
	}

	private isRangeInTextEdits(document: TextDocument,edit: WorkspaceEdit, range: Range): boolean {
		for (const textEdit of edit.get(document.uri)) {
			if (textEdit.range === range) {
				return true;
			}	
		}
		return false;
	}

	/**
	 * Computes a new file name for a PHP symbol
	 *
	 * @param   {string}  newName   Name of symbol ("kind" = class, interface, module)
	 * @param   {Uri}     resource  URI for current file to determine scope for preference
	 *
	 * @return  {string}            New filename, same as newName or kebab cased
	 */
	private getPhpFileNameForSymbol(newName: string, resource: Uri): string {
	const config = workspace.getConfiguration("phpRefactorTool", resource);
	const pattern = config.get<"symbol" | "wordpress">(
		"fileNamePattern",
		"symbol"
	);

	if (pattern === "wordpress") {
		// Take only the trailing segment after namespace, if any
		const base = newName.split("\\").pop() ?? newName;

		// WordPress-style: my-plugin-foo.php from My_Plugin_Foo or MyPluginFoo
		const kebab = base
		// split camelCase / StudlyCaps: MyPluginFoo -> My-Plugin-Foo
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		// underscores to hyphens: My_Plugin_Foo -> My-Plugin-Foo
		.replace(/_/g, "-")
		// strip anything weird
		.replace(/[^a-zA-Z0-9-]/g, "")
		.toLowerCase()
		// normalize multi-hyphens
		.replace(/-+/g, "-");

		return kebab;
	}

	// default: match the class name exactly
	return newName;
	}
}
