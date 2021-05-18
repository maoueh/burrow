import ts, { factory } from 'typescript';
import { ABI } from './lib/abi';
import { createCallerFunction } from './lib/caller';
import { declareEvents, eventTypes, generateContractObject } from './lib/contract';
import { generateDecodeObject } from './lib/decoder';
import { generateDeployFunction } from './lib/deployer';
import { generateEncodeObject } from './lib/encoder';
import { createLinkerFunction } from './lib/linker';
import { Provider } from './lib/provider';
import { getContractMethods } from './lib/solidity';
import { declareConstant, ExportToken, importBurrow, importReadable } from './lib/syntax';
import Func = ABI.Func;

export { decodeOutput, encodeInput, importLocal, inputDescriptionFromFiles, tokenizeLinks } from './lib/compile';

export type Compiled = {
  name: string;
  abi: ABI.FunctionOrEvent[];
  bin: string;
  links: Array<string>;
};

const abiName = factory.createIdentifier('abi');
const bytecodeName = factory.createIdentifier('bytecode');

// Note: this is a very useful tool for discovering the correct Typescript factory API calls to produce a particular
//piece of syntax: https://ts-ast-viewer.com
export function newFile(contracts: Compiled[], burrowImportPath: string): ts.Node[] {
  const provider = new Provider();

  return [
    ts.addSyntheticLeadingComment(
      importReadable(),
      ts.SyntaxKind.SingleLineCommentTrivia,
      'Code generated by solts. DO NOT EDIT.',
    ),
    importBurrow(burrowImportPath),
    provider.createInterface(),
    createCallerFunction(provider),
    createLinkerFunction(),
    ...contracts.map((contract) => {
      const methods = getContractMethods(contract.abi);

      const deploy = contract.abi.find((abi): abi is Func => abi.type === 'constructor');

      // No deploy function for interfaces
      const deployFunction = contract.bin
        ? [
            declareConstant(bytecodeName, factory.createStringLiteral(contract.bin, true), true),
            generateDeployFunction(deploy, bytecodeName, contract.links, provider, abiName),
          ]
        : [];
      const statements = [
        declareConstant(abiName, factory.createStringLiteral(JSON.stringify(contract.abi), true), true),
        ...deployFunction,
        generateContractObject(methods, provider),
        ...eventTypes(),
        declareEvents(methods),
        generateEncodeObject(methods, provider, abiName),
        generateDecodeObject(methods, provider, abiName),
      ];
      return factory.createModuleDeclaration(
        undefined,
        [ExportToken],
        factory.createIdentifier(contract.name),
        factory.createModuleBlock(statements),
      );
    }),
  ];
}

export function printNodes(...nodes: ts.Node[]): string {
  const target = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return nodes.map((node) => printer.printNode(ts.EmitHint.Unspecified, node, target)).join('\n');
}
