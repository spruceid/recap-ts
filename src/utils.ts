import { base58btc } from 'multiformats/bases/base58';
import { base64url } from 'multiformats/bases/base64';
import { CID } from 'multiformats/cid';

export type PlainJSON = boolean | number | string | { [key: string]: PlainJSON } | Array<PlainJSON>;
export type AttObj = { [key: string]: { [key: string]: Array<PlainJSON> } };

const stringRegex = /^[a-zA-Z0-9.*_+-]$/g;
const abilityStringRegex = /^[a-zA-Z0-9.*_+-]\/[a-zA-Z0-9.*_+-]$/g;

export const validString = (str: string) =>
    str.match(stringRegex) !== null

export const validAbString = (str: string) =>
    str.match(abilityStringRegex) !== null

export const encodeRecap = (att: AttObj, prf: Array<CID>) => base64url.encode(new TextEncoder().encode(JSON.stringify({
    att: orderObject(att),
    prf: prf.map(cid => cid.toV1().toString(base58btc.encoder))
})))

export const decodeRecap = (recap: string): { att: AttObj, prf: Array<CID> } => {
    const { att, prf } = JSON.parse(new TextDecoder().decode(base64url.decode(recap)));

    // TODO ensure the att keys are valid URIs
    // because URIs are so broad, there's no easy/efficient way to do this
    for (const ob of Object.values(att)) {
        if (!(ob instanceof Object)) {
            throw new Error('Invalid attenuation object');
        }
        for (const ab of Object.keys(ob)) {
            if (!validAbString(ab)) {
                throw new Error('Invalid ability string');
            }
        }
    }

    if (!isSorted(att)) {
        throw new Error('Attenuation object is not properly sorted');
    }

    return { att, prf: prf.map((cid: string) => CID.parse(cid)) }
}

export const isSorted = (obj: PlainJSON): boolean => {
    if (obj instanceof Array) {
        // its an array
        return obj.every(isSorted)
    } else if (obj instanceof Object) {
        // its an object
        return Object.keys(obj) === Object.keys(obj).sort() && Object.values(obj).every(isSorted)
    } else {
        // its a primitive
        return true
    }
}

export const orderObject = (obj: PlainJSON): PlainJSON => {
    if (obj instanceof Array) {
        // its an array
        return obj.map(orderObject)
    } else if (obj instanceof Object) {
        // its an object
        return Object.keys(obj).sort().reduce((sorted, key) => {
            sorted[key] = orderObject(obj[key]);
            return sorted;
        }, {} as { [key: string]: PlainJSON })

    } else {
        // its a primitive
        return obj
    }
}
