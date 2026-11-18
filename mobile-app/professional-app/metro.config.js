// Metro config: lets the app compile the shared, framework-independent packages that live
// outside this folder (../../catalog, ../../contracts, ../../design-system). They have no dependencies.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const repoRoot = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);

config.watchFolders = ["catalog", "contracts", "design-system"].map((dir) => path.join(repoRoot, dir));
// Shared packages resolve their dependencies (e.g. zod for contracts) from this app only.
config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules")];

module.exports = config;
