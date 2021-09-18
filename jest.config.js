module.exports = {
  snapshotFormat: {
    printBasicPrototype: false,
  },
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "esbuild-jest",
      {
        sourcemap: true,
        loaders: {
          ".spec.ts": "tsx",
        },
      },
    ],
  },
};
