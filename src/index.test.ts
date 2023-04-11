import { CID } from 'multiformats/cid';

import { Recap } from './index';
import { orderObject, validAbString, isSorted } from './utils';

describe('Recap Handling', () => {
    test('should build a recap', () => {
        const recap = new Recap();

        expect(recap.proofs).toEqual([]);

        recap.addAttenuation('kepler:example://default/kv', 'kv', 'read');
        expect(recap.attenuations).toEqual({
            'https://example.com': { 'crud/read': [] },
            'kepler:example://default/kv': { 'kv/read': [] }
        });
        expect(recap.proofs).toEqual([]);

        recap.addAttenuation('kepler:example://default/kv', 'kv', 'write', { max: 10 });
        expect(recap.attenuations).toEqual({
            'https://example.com': { 'crud/read': [] },
            'kepler:example://default/kv': { 'kv/read': [], 'kv/write': [{ max: 10 }] }
        });
        expect(recap.proofs).toEqual([]);

        const cidStr = 'bagaaierasords4njcts6vs7qvdjfcvgnume4hqohf65zsfguprqphs3icwea';
        const cid = CID.parse(cidStr);

        recap.addProof(cidStr);
        expect(recap.proofs).toEqual([cid]);
    });
    test('should encode properly', () => {
        const encoded = '';
        const recap = new Recap();

    });
    test('should decode properly', () => {
        const encoded = '';
        const recap = Recap.decode(encoded);
    })
    test('should roundtrip', () => {
        const encoded = [''];
        encoded.map(e => {
            const recap = Recap.decode(e);
            expect(recap.encode()).toEqual(e);
        })
    });
})

describe('Utils', () => {
    const unordered = {
        c: 1,
        b: 2,
        ca: 3,
        bnested: {
            c: [3, 2, 1],
            b: 2
        }
    };
    const ordered = {
        b: 2,
        bnested: {
            b: 2,
            c: [3, 2, 1]
        },
        c: 1,
        ca: 3
    };
    const validStrings = ['crud/read', 'kepler/*', 'https/put'];
    const invalidStrings = ['crud', 'crud/read/write', 'with a/space', 'with/a space'];

    test('should order an object', () => {
        expect(orderObject(unordered)).toEqual(ordered);
    })
    test('should test for ordering', () => {
        expect(isSorted(ordered)).toBeTruthy();
        expect(isSorted(unordered)).toBeFalsy();
    })
    test('should test for valid strings', () => {
        validStrings.forEach((str) => {
            expect(validAbString(str)).toBeTruthy();
        })
        invalidStrings.forEach((str) => {
            expect(validAbString(str)).toBeFalsy();
        })
    })
})
