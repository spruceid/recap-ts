import { CID } from 'multiformats/cid';
import { base58btc } from 'multiformats/bases/base58';
import { base64url } from 'multiformats/bases/base64';

export type PlainJSON = boolean | number | string | { [key: string]: PlainJSON } | { [key: number]: PlainJSON } | Array<PlainJSON>;
export type AttObj = { [key: string]: { [key: string]: Array<PlainJSON> } };

export class Recap {
    #prf: Array<CID>;
    #att: AttObj;

    constructor(att: AttObj = {}, prf: Array<CID> = []) {
        this.#prf = prf;
        this.#att = att;
    }

    get proofs(): Array<CID> {
        return this.#prf;
    }

    get attenuations(): AttObj {
        return this.#att;
    }

    get statement(): string {
        const att = orderObject(this.attenuations);
        let statement = "I further authorize the stated URI to perform the following actions on my behalf: ";

        let section = 1;
        for (const [resource, abilities] of Object.entries(att)) {
            const resourceAbilities = Object.keys(abilities).reduce((acc, cur) => {
                const [namespace, name] = cur.split('/');
                if (acc[namespace] === undefined) {
                    acc[namespace] = [name];
                } else {
                    acc[namespace].push(name);
                }
                return acc;
            }, {}) as { [key: string]: Array<string> };
            for (const [namespace, names] of Object.entries(resourceAbilities)) {
                statement += `(${section}) "${namespace}": ${names.map((n: string) => '"' + n + '"').join(', ')} for "${resource}". `;
                section += 1;
            }
        }

        return statement
    }

    addProof(cid: string | CID) {
        if (typeof cid === 'string') {
            this.#prf.push(CID.parse(cid))
        } else {
            this.#prf.push(cid);
        }
    }

    addAttenuation(resource: string, namespace: string = '*', name: string = '*', restriction?: PlainJSON) {
        if (!validString(namespace) || namespace === '*') {
            throw new Error('Invalid namespace');
        }
        if (!validString(name)) {
            throw new Error('Invalid name');
        }

        const abString = `${namespace}/${name}`;
        const ex = this.#att[resource];

        if (ex !== undefined) {
            if (restriction !== undefined) {
                ex[abString].push(restriction);
            }
        } else {
            this.#att[resource] = { [abString]: restriction ? [restriction] : [] };
        }
    }

    static decode(recap: string): Recap {
        if (!recap.startsWith(urnRecapPrefix)) {
            throw new Error('Invalid recap urn');
        }

        const { att, prf } = decodeRecap(recap.slice(urnRecapPrefix.length));
        return new Recap(att, prf)
    }

    encode(): string {
        return `${urnRecapPrefix}${encodeRecap(this.#att, this.#prf)}`
    }
}

const urnRecapPrefix = 'urn:recap:';
const stringRegex = /^[a-zA-Z0-9.*_+-]$/g;
const abilityStringRegex = /^[a-zA-Z0-9.*_+-]\/[a-zA-Z0-9.*_+-]$/g;

const validString = (str: string) =>
    str.match(stringRegex) !== null

const validAbString = (str: string) =>
    str.match(abilityStringRegex) !== null

const encodeRecap = (att: AttObj, prf: Array<CID>) => base64url.encode(new TextEncoder().encode(JSON.stringify({
    att: orderObject(att),
    prf: prf.map(cid => cid.toV1().toString(base58btc.encoder))
})))

const decodeRecap = (recap: string): { att: AttObj, prf: Array<CID> } => {
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

const isSorted = (obj: PlainJSON): boolean => {
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

const orderObject = (obj: PlainJSON): PlainJSON =>
    Object.keys(obj).sort().reduce((sorted, key) => {
        const value = obj[key];
        sorted[key] = value instanceof Array ? value.map(orderObject)
            : value instanceof Object ? orderObject(value) : obj[key];
        return sorted
    }, {})
