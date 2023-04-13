import { CID } from 'multiformats/cid';
import {
    AttObj,
    PlainJSON,
    orderObject,
    encodeRecap,
    decodeRecap,
    validString
} from './utils';

export { AttObj, PlainJSON, CID };
const urnRecapPrefix = 'urn:recap:';

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
            }, {} as { [key: string]: Array<string> });

            for (const [namespace, names] of Object.entries(resourceAbilities)) {
                statement += `(${section}) "${namespace}": ${names.map(n => '"' + n + '"').join(', ')} for "${resource}". `;
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

    addAttenuation(resource: string, namespace: string = '*', name: string = '*', restriction: PlainJSON = {}) {
        if (!validString(namespace) || namespace === '*') {
            throw new Error('Invalid ability namespace');
        }
        if (!validString(name)) {
            throw new Error('Invalid ability name');
        }

        const abString = `${namespace}/${name}`;
        const ex = this.#att[resource];

        if (ex !== undefined) {
            ex[abString].push(restriction);
        } else {
            this.#att[resource] = { [abString]: [restriction] };
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
