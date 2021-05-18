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
export module Contains {
    export const abi = '[{"constant":true,"inputs":[{"internalType":"address[]","name":"_list","type":"address[]"},{"internalType":"address","name":"_value","type":"address"}],"name":"contains","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"pure","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256[]","name":"_list","type":"uint256[]"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"contains","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"pure","type":"function"}]';
    export const bytecode = '608060405234801561001057600080fd5b50610304806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80633da80d661461003b578063b32b8e2c1461012b575b600080fd5b6101116004803603604081101561005157600080fd5b810190808035906020019064010000000081111561006e57600080fd5b82018360208201111561008057600080fd5b803590602001918460208302840111640100000000831117156100a257600080fd5b919080806020026020016040519081016040528093929190818152602001838360200280828437600081840152601f19601f820116905080830192505050505050509192919290803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610205565b604051808215151515815260200191505060405180910390f35b6101eb6004803603604081101561014157600080fd5b810190808035906020019064010000000081111561015e57600080fd5b82018360208201111561017057600080fd5b8035906020019184602083028401116401000000008311171561019257600080fd5b919080806020026020016040519081016040528093929190818152602001838360200280828437600081840152601f19601f82011690508083019250505050505050919291929080359060200190929190505050610280565b604051808215151515815260200191505060405180910390f35b600080600090505b8351811015610274578273ffffffffffffffffffffffffffffffffffffffff1684828151811061023957fe5b602002602001015173ffffffffffffffffffffffffffffffffffffffff16141561026757600191505061027a565b808060010191505061020d565b50600090505b92915050565b600080600090505b83518110156102c3578284828151811061029e57fe5b602002602001015114156102b65760019150506102c9565b8080600101915050610288565b50600090505b9291505056fea265627a7a7231582032d6f06ddf667cc291458c6ed27a81fe8ef6fa213f3cf25c0fef50500bc05f2264736f6c63430005110032';
    export function deploy(client: Provider): Promise<string> {
        const codec = client.contractCodec(abi);
        let linkedBytecode = bytecode;
        const data = Buffer.concat([Buffer.from(linkedBytecode, "hex"), codec.encodeDeploy()]);
        const payload = client.payload(data);
        return client.deploy(payload);
    }
    export const contract = (client: Provider, address: string) => ({ functions: { contains(_list: string[], _value: string): Promise<[
                boolean
            ]> {
                const data = encode(client).contains[0](_list, _value);
                return call<[
                    boolean
                ]>(client, address, data, true, (data: Uint8Array | undefined) => {
                    return decode(client, data).contains[0]();
                });
            }, contains_1(_list: number[], _value: number): Promise<[
                boolean
            ]> {
                const data = encode(client).contains[1](_list, _value);
                return call<[
                    boolean
                ]>(client, address, data, true, (data: Uint8Array | undefined) => {
                    return decode(client, data).contains[1]();
                });
            } } as const, listeners: {} as const } as const);
    type EventRegistry = typeof events;
    export type Event = keyof EventRegistry;
    export type TaggedPayload<T extends Event> = ReturnType<EventRegistry[T]["tagged"]>;
    const events = {} as const;
    export const encode = (client: Provider) => { const codec = client.contractCodec(abi); return {
        contains: [(_list: string[], _value: string) => { return codec.encodeFunctionData("3DA80D66", _list, _value); }, (_list: number[], _value: number) => { return codec.encodeFunctionData("B32B8E2C", _list, _value); }] as const
    }; };
    export const decode = (client: Provider, data: Uint8Array | undefined, topics: Uint8Array[] = []) => { const codec = client.contractCodec(abi); return {
        contains: [(): [
                boolean
            ] => { return codec.decodeFunctionResult ("3DA80D66", data); }, (): [
                boolean
            ] => { return codec.decodeFunctionResult ("B32B8E2C", data); }] as const
    }; };
}