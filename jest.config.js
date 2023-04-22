const { pathsToModuleNameMapper } = require("ts-jest");
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
const { compilerOptions } = require("./tsconfig");

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: Object.assign(
    pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
    {
      "^multiformats(.*)$":
        "<rootDir>/node_modules/multiformats/dist/index.min.js",
      "^ethers(.*)$": "<rootDir>/node_modules/ethers/lib/index.js",
    }
  ),
};
