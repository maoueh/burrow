//Code generated by solts. DO NOT EDIT.
import { Readable } from "stream";
import { Address, BlockRange, CallTx, ContractCodec, EndOfStream, EventStream, LogEvent, Result } from "../../index";
interface Provider {
    deploy(msg: CallTx): Promise<Address>;
    call(msg: CallTx): Promise<Uint8Array | undefined>;
    callSim(msg: CallTx): Promise<Uint8Array | undefined>;
    listen(signature: string, address: string, callback: (err?: Error | EndOfStream, log?: LogEvent) => void, range?: BlockRange): EventStream;
    payload(data: string | Uint8Array, address?: string): CallTx;
    contractCodec(contractABI: string): ContractCodec;
}
async function call<Output>(client: Provider, addr: string, data: Uint8Array, isSim: boolean, callback: (exec: Uint8Array | undefined) => Output): Promise<Output> {
    const payload = client.payload(data, addr);
    const txe = await (isSim ? client.callSim(payload) : client.call(payload));
    return callback(txe);
}
function linker(bytecode: string, name: string, address: string): string {
    address = address + Array(40 - address.length + 1).join("0");
    const truncated = name.slice(0, 36);
    const label = "__" + truncated + Array(37 - truncated.length).join("_") + "__";
    while (bytecode.indexOf(label) >= 0)
        bytecode = bytecode.replace(label, address);
    return bytecode;
}
export module Multiple {
    export const abi = '[{"constant":true,"inputs":[],"name":"get","outputs":[{"internalType":"int256","name":"","type":"int256"},{"internalType":"int256","name":"","type":"int256"},{"internalType":"int256","name":"","type":"int256"}],"payable":false,"stateMutability":"pure","type":"function"}]';
    export const bytecode = '6080604052348015600f57600080fd5b5060ab8061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80636d4ce63c14602d575b600080fd5b60336057565b60405180848152602001838152602001828152602001935050505060405180910390f35b600080600060016002600382925081915080905092509250925090919256fea265627a7a72315820db13aa50f1e1ad94cdc8fb2b158b105d0d0812d53d9851ed8a9bfa5447e3c17864736f6c63430005110032';
    export function deploy(client: Provider): Promise<string> {
        const codec = client.contractCodec(abi);
        let linkedBytecode = bytecode;
        const data = Buffer.concat([Buffer.from(linkedBytecode, "hex"), codec.encodeDeploy()]);
        const payload = client.payload(data);
        return client.deploy(payload);
    }
    export const contract = (client: Provider, address: string) => ({ functions: { get(): Promise<[
                number,
                number,
                number
            ]> {
                const data = encode(client).get();
                return call<[
                    number,
                    number,
                    number
                ]>(client, address, data, true, (data: Uint8Array | undefined) => {
                    return decode(client, data).get();
                });
            } } as const, listeners: {} as const } as const);
    type EventRegistry = typeof events;
    export type Event = keyof EventRegistry;
    export type TaggedPayload<T extends Event> = ReturnType<EventRegistry[T]["tagged"]>;
    const events = {} as const;
    export const encode = (client: Provider) => { const codec = client.contractCodec(abi); return {
        get: () => { return codec.encodeFunctionData("6D4CE63C"); }
    }; };
    export const decode = (client: Provider, data: Uint8Array | undefined, topics: Uint8Array[] = []) => { const codec = client.contractCodec(abi); return {
        get: (): [
            number,
            number,
            number
        ] => { return codec.decodeFunctionResult ("6D4CE63C", data); }
    }; };
}