import { base58btc } from 'multiformats/bases/base58';
import { base64url } from 'multiformats/bases/base64';
import { CID } from 'multiformats/cid';
import serialize from 'canonicalize';

export type PlainJSON =
  | boolean
  | number
  | string
  | { [key: string]: PlainJSON }
  | Array<PlainJSON>;
export type AttObj = { [key: string]: { [key: string]: Array<PlainJSON> } };

const stringRegex = /^[a-zA-Z0-9.*_+-]+$/g;
const abilityStringRegex = /^[a-zA-Z0-9.*_+-]+\/[a-zA-Z0-9.*_+-]+$/g;

export const validString = (str: string) => str.match(stringRegex) !== null;

export const validAbString = (str: string) =>
  str.match(abilityStringRegex) !== null;

export const encodeRecap = (att: AttObj, prf: Array<CID>) =>
  base64url.encoder.baseEncode(
    new TextEncoder().encode(
      serialize({
        att: att,
        prf: prf.map(cid => cid.toV1().toString(base58btc.encoder)),
      })
    )
  );

export const decodeRecap = (
  recap: string
): { att: AttObj; prf: Array<CID> } => {
  const { att, prf } = JSON.parse(
    new TextDecoder().decode(base64url.decoder.baseDecode(recap))
  );

  // check the att is an object
  if (!(att instanceof Object) || Array.isArray(att)) {
    throw new Error('Invalid attenuation object');
  }
  // check the prf is a list
  if (!Array.isArray(prf) || prf.some(cid => typeof cid !== 'string')) {
    throw new Error('Invalid proof list');
  }

  checkAtt(att);

  if (!isSorted(att)) {
    throw new Error('Attenuation object is not properly sorted');
  }

  return {
    att,
    prf: prf.map((cid: string) => CID.parse(cid, base58btc)),
  };
};

export const checkAtt = (att: AttObj): att is AttObj => {
  // TODO ensure the att keys are valid URIs
  // because URIs are so broad, there's no easy/efficient way to do this
  for (const ob of Object.values(att)) {
    // check the att entries are objects
    if (!(ob instanceof Object)) {
      throw new Error('Invalid attenuation object');
    }
    for (const [ab, nb] of Object.entries(ob)) {
      // check the ability strings are valid
      if (!validAbString(ab)) {
        throw new Error(`Invalid ability string: ${ab}`);
      }
      // check the nota-bene list is a list of objects
      if (
        !Array.isArray(nb) ||
        nb.some(n => !(n instanceof Object) || Array.isArray(n))
      ) {
        throw new Error(`Invalid nota-bene list for ${ab}`);
      }
    }
  }
  return true;
};

export const isSorted = (obj: PlainJSON): boolean => {
  if (Array.isArray(obj)) {
    // its an array
    return obj.every(isSorted);
  } else if (obj instanceof Object) {
    // its an object
    const keys = Object.keys(obj);
    return (
      Object.keys(obj)
        .sort()
        .every((v, i) => v === keys[i]) && Object.values(obj).every(isSorted)
    );
  } else {
    // its a primitive
    return true;
  }
};
