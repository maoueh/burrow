import ts, { factory, ObjectLiteralElementLike } from 'typescript';
import { callName } from './caller';
import { decodeName } from './decoder';
import { encodeName } from './encoder';
import { callGetDataFromLog, callGetTopicsFromLog, eventSigHash } from './events';
import { errName, EventErrParameter, LogEventParameter, logName, Provider } from './provider';
import { ContractMethodsList, getRealType, inputOuputsToType, Signature } from './solidity';
import {
  asConst,
  asRefNode,
  BlockRangeType,
  constObject,
  createCall,
  createCallbackExpression,
  createParameter,
  createPromiseOf,
  declareConstant,
  EqualsGreaterThanToken,
  EventStream,
  MaybeUint8ArrayType,
  Method,
  prop,
  ReturnType,
  StringType,
  Undefined,
} from './syntax';

export const contractName = factory.createIdentifier('contract');
export const functionsGroupName = factory.createIdentifier('functions');
export const listenersGroupName = factory.createIdentifier('listeners');
export const eventsGroupName = factory.createIdentifier('events');
export const eventTypeName = factory.createIdentifier('Event');
const taggedPayloadName = factory.createIdentifier('TaggedPayload');
const eventRegistryName = factory.createIdentifier('EventRegistry');

const dataName = factory.createIdentifier('data');
const clientName = factory.createIdentifier('client');
const addressName = factory.createIdentifier('address');
const eventName = factory.createIdentifier('event');

const signatureName = factory.createIdentifier('signature');
const taggedName = factory.createIdentifier('tagged');

function solidityFunction(name: string, signatures: Signature[], index: number): ts.MethodDeclaration {
  const signature = signatures[index];
  const args = signature.inputs.map((input) => factory.createIdentifier(input.name));
  const encodeFunctionOrOverloadsArray = prop(createCall(encodeName, [clientName]), name);

  // Special case for overloads
  const hasOverloads = signatures.length > 1;

  const encoderFunction = hasOverloads
    ? factory.createElementAccessExpression(encodeFunctionOrOverloadsArray, index)
    : encodeFunctionOrOverloadsArray;

  const decoderFunctionOrOverloadsArray = prop(createCall(decodeName, [clientName, dataName]), name);

  const decoderFunction = hasOverloads
    ? factory.createElementAccessExpression(decoderFunctionOrOverloadsArray, index)
    : decoderFunctionOrOverloadsArray;

  const encode = declareConstant(dataName, createCall(encoderFunction, args));

  const returnType = inputOuputsToType(signature.outputs);

  const call = factory.createCallExpression(
    callName,
    [returnType],
    [
      clientName,
      addressName,
      dataName,
      signature.constant ? factory.createTrue() : factory.createFalse(),
      factory.createArrowFunction(
        undefined,
        undefined,
        [createParameter(dataName, MaybeUint8ArrayType)],
        undefined,
        undefined,
        factory.createBlock([factory.createReturnStatement(createCall(decoderFunction, []))], true),
      ),
    ],
  );

  const params = signature.inputs.map((input) => createParameter(input.name, getRealType(input.type)));
  // Suffix overloads
  return new Method(index > 0 ? `${name}_${index}` : name)
    .parameters(params)
    .returns(createPromiseOf(returnType))
    .declaration([encode, factory.createReturnStatement(call)], true);
}

function solidityEvent(name: string, signature: Signature, provider: Provider): ts.MethodDeclaration {
  const callback = factory.createIdentifier('callback');
  const range = factory.createIdentifier('range');
  // Receivers of LogEventParameter
  const data = callGetDataFromLog(logName);
  const topics = callGetTopicsFromLog(logName);
  const decoderFunction = prop(createCall(decodeName, [clientName, data, topics]), name);
  return new Method(name)
    .parameter(
      callback,
      createCallbackExpression([
        EventErrParameter,
        createParameter(eventName, inputOuputsToType(signature.inputs), undefined, true),
      ]),
    )
    .parameter(range, BlockRangeType, true)
    .returns(asRefNode(EventStream))
    .declaration([
      factory.createReturnStatement(
        provider.methods.listen.call(
          clientName,
          factory.createStringLiteral(eventSigHash(name, signature.inputs)),
          addressName,

          factory.createArrowFunction(
            undefined,
            undefined,
            [EventErrParameter, LogEventParameter],
            undefined,
            undefined,
            factory.createBlock([
              factory.createIfStatement(errName, factory.createReturnStatement(createCall(callback, [errName]))),
              factory.createReturnStatement(createCall(callback, [Undefined, createCall(decoderFunction)])),
            ]),
          ),
          range,
        ),
      ),
    ]);
}

export function generateContractObject(abi: ContractMethodsList, provider: Provider): ts.VariableStatement {
  const functions = abi.filter((a) => a.type === 'function');
  const events = abi.filter((a) => a.type === 'event');
  return declareConstant(
    contractName,
    factory.createArrowFunction(
      undefined,
      undefined,
      [createParameter(clientName, provider.type()), createParameter(addressName, StringType)],
      undefined,
      EqualsGreaterThanToken,
      asConst(
        factory.createObjectLiteralExpression([
          createGroup(
            functionsGroupName,
            functions.flatMap((a) =>
              a.signatures.map((signature, index) => solidityFunction(a.name, a.signatures, index)),
            ),
          ),
          createGroup(
            listenersGroupName,
            events.map((a) => solidityEvent(a.name, a.signatures[0], provider)),
          ),
        ]),
      ),
    ),
    true,
  );
}

export function declareEvents(abi: ContractMethodsList): ts.VariableStatement {
  const events = abi.filter((a) => a.type === 'event');
  return declareConstant(
    eventsGroupName,
    constObject(
      events.map((a) => {
        const signature = a.signatures[0];
        return factory.createPropertyAssignment(
          a.name,
          constObject([
            factory.createPropertyAssignment(signatureName, factory.createStringLiteral(signature.hash)),
            factory.createPropertyAssignment(
              taggedName,
              factory.createArrowFunction(
                undefined,
                undefined,
                signature.inputs.map((i) => createParameter(i.name, getRealType(i.type))),
                undefined,
                EqualsGreaterThanToken,
                constObject([
                  factory.createPropertyAssignment('name', factory.createStringLiteral(a.name)),
                  factory.createPropertyAssignment(
                    'payload',
                    constObject(
                      signature.inputs.map(({ name }) =>
                        factory.createPropertyAssignment(name, factory.createIdentifier(name)),
                      ),
                    ),
                  ),
                ]),
              ),
            ),
          ]),
        );
      }),
    ),
  );
}

function createGroup(name: ts.Identifier, elements: ObjectLiteralElementLike[]): ts.PropertyAssignment {
  return factory.createPropertyAssignment(name, constObject(elements));
}

// TODO: reverse lookup event by sig in listen to discover name, this doesn't need to live in gen code, I think we are pretty much done in gen
export function eventTypes(): ts.TypeAliasDeclaration[] {
  return [
    factory.createTypeAliasDeclaration(
      undefined,
      undefined,
      eventRegistryName,
      undefined,
      factory.createTypeQueryNode(eventsGroupName),
    ),
    factory.createTypeAliasDeclaration(
      undefined,
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      eventTypeName,
      undefined,
      factory.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        factory.createTypeReferenceNode(eventRegistryName, undefined),
      ),
    ),
    factory.createTypeAliasDeclaration(
      undefined,
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      taggedPayloadName,
      [
        factory.createTypeParameterDeclaration(
          factory.createIdentifier('T'),
          factory.createTypeReferenceNode(eventTypeName, undefined),
          undefined,
        ),
      ],
      factory.createTypeReferenceNode(ReturnType, [
        factory.createIndexedAccessTypeNode(
          factory.createIndexedAccessTypeNode(
            factory.createTypeReferenceNode(eventRegistryName, undefined),
            factory.createTypeReferenceNode(factory.createIdentifier('T'), undefined),
          ),
          factory.createLiteralTypeNode(factory.createStringLiteral(taggedName.text)),
        ),
      ]),
    ),
  ];
}
