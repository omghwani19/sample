const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function parseDotenv(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadDotenv(rootDir) {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return parseDotenv(fs.readFileSync(envPath, "utf8"));
}

function pickValue(dotenv, key) {
  return process.env[key] || dotenv[key] || "";
}

function resolveGuidePath(rootDir, dotenv) {
  const configuredPath = pickValue(dotenv, "GAT_GUIDE_PATH");
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(rootDir, configuredPath);
  }

  return path.join(os.homedir(), "Downloads", "GAT_SEARCH_GUIDE_v2026.txt");
}

function loadRuntimeConfig(rootDir) {
  const dotenv = loadDotenv(rootDir);
  const googleApiKey = pickValue(dotenv, "GOOGLE_API_KEY");
  const googleCseId = pickValue(dotenv, "GOOGLE_CSE_ID");

  return {
    rootDir,
    guidePath: resolveGuidePath(rootDir, dotenv),
    port: Number(pickValue(dotenv, "PORT") || process.env.PORT || 4173),
    googleApiKey,
    googleCseId
  };
}

function getStatusPayload(runtimeConfig, guide) {
  const missingConfig = [];
  if (!runtimeConfig.googleApiKey) {
    missingConfig.push("GOOGLE_API_KEY");
  }
  if (!runtimeConfig.googleCseId) {
    missingConfig.push("GOOGLE_CSE_ID");
  }

  return {
    apiConfigured: missingConfig.length === 0,
    searchProvider: "Google Custom Search JSON API",
    missingConfig,
    guideLoaded: guide.loadedFromFile,
    guidePath: runtimeConfig.guidePath,
    guideSource: guide.loadedFromFile ? "file" : "built-in",
    sourceCount: guide.allSources.length,
    topicCount: guide.includedTopics.length
  };
}

module.exports = {
  loadRuntimeConfig,
  getStatusPayload
};
