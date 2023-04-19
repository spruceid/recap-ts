import { pathsToModuleNameMapper } from 'ts-jest'
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
import tsc from './tsconfig.json' assert { type: 'json' }

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  modulePaths: [tsc.compilerOptions.baseUrl],
  moduleNameMapper: Object.assign(
    pathsToModuleNameMapper(tsc.compilerOptions.paths, { prefix: '<rootDir>/' }),
    {
      '^multiformats(.*)$': '<rootDir>/node_modules/multiformats/dist/index.min.js',
      '^ethers(.*)$': '<rootDir>/node_modules/ethers/lib/index.js',
    }
  )
};
