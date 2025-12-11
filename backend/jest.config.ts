module.exports = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": [
    "<rootDir>/src",
    "<rootDir>/tests"
  ],
  "testMatch": [
    "**/__tests__/**/*.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ],
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts"
  ],
  "coverageDirectory": "coverage",
  "coverageReporters": [
    "text",
    "lcov",
    "html"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 75,
      "lines": 80,
      "statements": 80
    }
  },
  "testTimeout": 30000,
  "setupFilesAfterEnv": [
    "<rootDir>/tests/setup.ts"
  ],
  "globalSetup": "<rootDir>/tests/globalSetup.ts",
  "globalTeardown": "<rootDir>/tests/globalTeardown.ts",
  "verbose": true,
  "forceExit": true,
  "detectOpenHandles": true,
  "maxWorkers": 1
};