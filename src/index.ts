import { CID } from 'multiformats/cid';
import {
  AttObj,
  PlainJSON,
  encodeRecap,
  decodeRecap,
  validString,
  checkAtt,
} from './utils';
import { SiweMessage } from 'siwe';

export { AttObj, PlainJSON, CID };
const urnRecapPrefix = 'urn:recap:';

export class Recap {
  #prf: Array<CID>;
  #att: AttObj;

  constructor(att: AttObj = {}, prf: Array<CID> | Array<string> = []) {
    checkAtt(att);
    this.#att = att;
    this.#prf = prf.map(cid =>
      typeof cid === 'string' ? CID.parse(cid) : cid
    );
  }

  get proofs(): Array<CID> {
    return this.#prf;
  }

  get attenuations(): AttObj {
    return this.#att;
  }

  get statement(): string {
    let statement =
      'I further authorize the stated URI to perform the following actions on my behalf: ';

    let section = 1;
    for (const resource of Object.keys(this.attenuations).sort()) {
      const resourceAbilities = Object.keys(this.attenuations[resource])
        .sort()
        .reduce((acc, cur) => {
          const [namespace, name] = cur.split('/');
          if (acc[namespace] === undefined) {
            acc[namespace] = [name];
          } else {
            acc[namespace].push(name);
          }
          return acc;
        }, {} as { [key: string]: Array<string> });

      for (const [namespace, names] of Object.entries(resourceAbilities)) {
        statement += `(${section}) "${namespace}": ${names
          .map(n => '"' + n + '"')
          .join(', ')} for "${resource}". `;
        section += 1;
      }
    }

    return statement;
  }

  addProof(cid: string | CID) {
    if (typeof cid === 'string') {
      this.#prf.push(CID.parse(cid));
    } else {
      this.#prf.push(cid);
    }
  }

  addAttenuation(
    resource: string,
    namespace: string = '*',
    name: string = '*',
    restriction: { [key: string]: PlainJSON } = {}
  ) {
    if (!validString(namespace)) {
      throw new Error('Invalid ability namespace');
    }
    if (!validString(name)) {
      throw new Error('Invalid ability name');
    }

    const abString = `${namespace}/${name}`;
    const ex = this.#att[resource];

    if (ex !== undefined) {
      if (ex[abString] !== undefined) {
        ex[abString].push(restriction);
      } else {
        ex[abString] = [restriction];
      }
    } else {
      this.#att[resource] = { [abString]: [restriction] };
    }
  }

  merge(other: Recap) {
    this.#prf.push(...other.proofs.filter(cid => !this.#prf.includes(cid)));

    for (const [resource, abilities] of Object.entries(other.attenuations)) {
      if (this.#att[resource] !== undefined) {
        const ex = this.#att[resource];
        for (const [ability, restrictions] of Object.entries(abilities)) {
          if (
            ex[ability] === undefined ||
            ex[ability].length === 0 ||
            ex[ability].every(r => Object.keys(r).length === 0)
          ) {
            ex[ability] = restrictions;
          } else {
            ex[ability].push(...restrictions);
          }
        }
      } else {
        this.#att[resource] = abilities;
      }
    }
  }

  static decode_urn(recap: string): Recap {
    if (!recap.startsWith(urnRecapPrefix)) {
      throw new Error('Invalid recap urn');
    }

    const { att, prf } = decodeRecap(recap.slice(urnRecapPrefix.length));
    return new Recap(att, prf);
  }

  static extract(siwe: SiweMessage): Recap {
    if (siwe.resources === undefined) {
      throw new Error('No resources in SiweMessage');
    }
    let last_index = siwe.resources.length - 1;
    return Recap.decode_urn(siwe.resources[last_index]);
  }

  static extract_and_verify(siwe: SiweMessage): Recap {
    const recap = Recap.extract(siwe);
    if (
      siwe.statement === undefined ||
      !siwe.statement.endsWith(recap.statement)
    ) {
      throw new Error('Invalid statement');
    }
    return recap;
  }

  add_to_siwe_message(siwe: SiweMessage): SiweMessage {
    try {
      // try merge with existing recap
      if (
        siwe.statement === undefined ||
        siwe.resources === undefined ||
        siwe.resources.length === 0
      ) {
        throw new Error('no recap');
      }
      let other = Recap.extract_and_verify(siwe);
      let previousStatement = other.statement;
      other.merge(this);
      siwe.statement =
        siwe.statement.slice(0, -previousStatement.length) + other.statement;
      siwe.resources[siwe.resources.length - 1] = other.encode();
      return siwe;
    } catch (e) {
      // no existing recap, just apply it
      siwe.statement =
        siwe.statement === undefined
          ? this.statement
          : siwe.statement + ' ' + this.statement;
      siwe.resources =
        siwe.resources === undefined
          ? [this.encode()]
          : [...siwe.resources, this.encode()];
      return siwe;
    }
  }

  encode(): string {
    return `${urnRecapPrefix}${encodeRecap(this.#att, this.#prf)}`;
  }
}
