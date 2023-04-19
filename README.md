# ReCap

A Typescript implementation of [ERC-5573 ReCap](https://eips.ethereum.org/EIPS/eip-5573), enabling applications to express [UCAN-style object capabilities](https://github.com/ucan-wg/spec) using [Sign In With Ethereum](https://eips.ethereum.org/EIPS/eip-4361).

This package is still ALPHA software, bugs may exist and APIs may change in future.

## Installation

ReCap can be installed via `npm`:

``` sh
npm -i siwe-recap
```

`yarn`:

``` sh
yarn add siwe-recap
```

or `package.json` entry:

``` json
{
  "dependencies": {
    "siwe-recap": "0.1.0"
  }
}
```

## Usage

ReCaps are designed to be used in conjunction with SIWE. They can be initialized and built as follows:

``` typescript
import { Recap } from 'siwe-recap';

const recap = new Recap();

recap.addAttenuation('https://example.com/my/resource', 'crud', 'read');
recap.addAttenuation('https://example.com/my/resource', 'crud', 'update', { maxTimes: 5 });
recap.addProof('bagaaierasords4njcts6vs7qvdjfcvgnume4hqohf65zsfguprqphs3icwea');

console.log(recap.attenuations);
// {
//   "https://example.com/my/resource": {
//     "crud/read": [{}],
//     "crud/update": [{ maxTimes: 5 }]
//   }
// }
```

They can also be applied to or extracted from SIWE messages:

``` typescript
import { SiweMessage } from 'siwe';
import { Recap } from 'siwe-recap';

const siwe = new SiweMessage( ... );

// we can extract the recap while verifying that the statement in `siwe` matches
// the recap listed in `siwe`s resource list
const recap = Recap.extract_and_verify(siwe);

// 
recap.addAttenuation('https://example.com/my/resource', 'crud', 'read');

// the new change will be merged into the existing recap in `siwe`
recap.add_to_siwe_messate(siwe);
```
