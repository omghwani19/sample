const fs = require("node:fs/promises");

const TIER_DEFINITIONS = [
  {
    tier: "Tier 1",
    label: "Core aviation media",
    sources: [
      ["Aviation Week", "aviationweek.com"],
      ["FlightGlobal", "flightglobal.com"],
      ["AINonline", "ainonline.com"],
      ["Leeham News", "leehamnews.com"],
      ["Aviation Pros", "aviationpros.com"],
      ["AirInsight", "airinsight.com"],
      ["AeroTime", "aerotime.aero"],
      ["Asian Aviation", "asianaviation.com"],
      ["Runway Girl Network", "runwaygirlnetwork.com"],
      ["Aircraft Interiors International", "aircraftinteriorsinternational.com"],
      ["Future Travel Experience", "futuretravelexperience.com"],
      ["International Airport Review", "internationalairportreview.com"],
      ["Passenger Terminal Today", "passengerterminaltoday.com"],
      ["Airport Technology", "airport-technology.com"],
      ["Airports International", "airportsinternational.com"],
      ["Routes Online", "routesonline.com"]
    ]
  },
  {
    tier: "Tier 2",
    label: "Aviation industry and airline news",
    sources: [
      ["Simple Flying", "simpleflying.com"],
      ["Airline Weekly", "airlineweekly.com"],
      ["Air Cargo Week", "aircargoweek.com"],
      ["Air Freight News", "airfreightnews.net"],
      ["AirTrader", "airtrader.com"],
      ["AviTrader", "avitrader.com"],
      ["Aviation24.be", "aviation24.be"],
      ["AviationA2Z", "aviationa2z.com"],
      ["AVIACIONLINE", "aviacionline.com"],
      ["Aviation Connect Africa", "aviationconnectafrica.com"],
      ["UAS Weekly", "uasweekly.com"]
    ]
  },
  {
    tier: "Tier 3",
    label: "Global business and general news",
    sources: [
      ["Reuters", "reuters.com"],
      ["Bloomberg", "bloomberg.com"],
      ["Financial Times", "ft.com"],
      ["BBC", "bbc.com"],
      ["AP News", "apnews.com"],
      ["NBC News", "nbcnews.com"],
      ["CBS News", "cbsnews.com"],
      ["ABC News", "abcnews.go.com"],
      ["CNBC", "cnbc.com"],
      ["Guardian", "theguardian.com"],
      ["Forbes", "forbes.com"],
      ["U.S. News", "usnews.com"]
    ]
  },
  {
    tier: "Tier 4",
    label: "Airport and passenger experience",
    sources: [
      ["International Airport Review", "internationalairportreview.com"],
      ["Passenger Terminal Today", "passengerterminaltoday.com"],
      ["Future Travel Experience", "futuretravelexperience.com"],
      ["Airport Industry News", "airportindustry-news.com"],
      ["Airports International", "airportsinternational.com"],
      ["Routes Online", "routesonline.com"],
      ["TTG Asia", "ttgasia.com"],
      ["Travel Weekly", "travelweekly.com"],
      ["TravelDailyNews", "traveldailynews.com"]
    ]
  },
  {
    tier: "Tier 5",
    label: "Policy and international organizations",
    sources: [
      ["IATA", "iata.org"],
      ["ICAO", "icao.int"],
      ["ACI World", "aci.aero"],
      ["UNITAR", "unitar.org"],
      ["UK Government", "gov.uk"],
      ["Federal Register", "federalregister.gov"],
      ["Transport & Environment", "transportenvironment.org"],
      ["Uniting Aviation", "unitingaviation.com"]
    ]
  },
  {
    tier: "Tier 6",
    label: "Technology, ESG, and analysis",
    sources: [
      ["McKinsey", "mckinsey.com"],
      ["Lux Research", "luxresearchinc.com"],
      ["Sia Partners", "sia-partners.com"],
      ["Carbon Herald", "carbonherald.com"],
      ["Carbon Tracker", "carbontracker.org"],
      ["ESG Today", "esgtoday.com"],
      ["FuelCellsWorks", "fuelcellsworks.com"],
      ["Renewable Matter", "renewablematter.eu"],
      ["GreenAir", "greenairnews.com"]
    ]
  }
];

const EXTENDED_SOURCES = [
  ["Aerospace Global News", "aerospaceglobalnews.com"],
  ["Business Travel News Europe", "businesstravelnewseurope.com"],
  ["CleanTechnica", "cleantechnica.com"],
  ["CompositesWorld", "compositesworld.com"],
  ["Daily Sabah", "dailysabah.com"],
  ["EIN Presswire", "einpresswire.com"],
  ["GlobeNewswire", "globenewswire.com"],
  ["Gulf News", "gulfnews.com"],
  ["Halldale", "halldale.com"],
  ["JDSupra", "jdsupra.com"],
  ["National Defense Magazine", "nationaldefensemagazine.org"],
  ["OpenPR", "openpr.com"],
  ["PR Newswire", "prnewswire.com"],
  ["Skift", "skift.com"],
  ["SITA", "sita.aero"],
  ["Sustainable Aviation Futures", "safinvestor.com"],
  ["The Korea Herald", "koreaherald.com"],
  ["The National", "thenationalnews.com"],
  ["The Straits Times", "straitstimes.com"],
  ["The Times of India", "timesofindia.indiatimes.com"],
  ["Travel and Tour World", "travelandtourworld.com"],
  ["Vertical Aerospace", "vertical-aerospace.com"],
  ["ZAGDaily", "zagdaily.com"]
];

const INCLUDED_TOPICS = [
  {
    topic: "Aviation policy and regulation",
    terms: ["aviation policy", "aviation regulation", "air transport policy", "FAA", "EASA", "ICAO", "IATA"]
  },
  {
    topic: "Airline strategy and industry structure",
    terms: ["airline strategy", "airline market", "airline merger", "network strategy", "fleet strategy"]
  },
  {
    topic: "Airport investment and infrastructure",
    terms: ["airport investment", "airport infrastructure", "terminal expansion", "runway", "airport technology"]
  },
  {
    topic: "Aircraft manufacturing and technology",
    terms: ["aircraft manufacturing", "aircraft technology", "Boeing", "Airbus", "engine technology"]
  },
  {
    topic: "Aviation MRO",
    terms: ["MRO", "maintenance repair overhaul", "aircraft maintenance", "aftermarket"]
  },
  {
    topic: "SAF and carbon policy",
    terms: ["SAF", "sustainable aviation fuel", "aviation carbon", "carbon policy", "net zero aviation"]
  },
  {
    topic: "UAM and eVTOL",
    terms: ["UAM", "urban air mobility", "eVTOL", "air taxi", "advanced air mobility"]
  },
  {
    topic: "Aviation security",
    terms: ["aviation security", "airport security", "cybersecurity aviation", "border security"]
  },
  {
    topic: "Aviation digital technology and data",
    terms: ["aviation data", "digital aviation", "AI aviation", "biometrics", "airport data"]
  }
];

const EXCLUDED_TERMS = [
  "sponsored content",
  "advertorial",
  "partner content",
  "press release",
  "simple corporate PR",
  "advertising",
  "travel guide",
  "travel tips",
  "things to do",
  "tourism",
  "tourism promotion",
  "vacation",
  "holiday",
  "holiday deals",
  "tour package",
  "mileage sale",
  "seat sale",
  "customer service",
  "lounge review",
  "flight review",
  "simple tips",
  "coupon",
  "giveaway"
];

function flattenSources() {
  const tiered = TIER_DEFINITIONS.flatMap((tier) =>
    tier.sources.map(([name, domain]) => ({
      name,
      domain,
      tier: tier.tier,
      label: tier.label
    }))
  );

  const extended = EXTENDED_SOURCES.map(([name, domain]) => ({
    name,
    domain,
    tier: "Extended",
    label: "Extended source database"
  }));

  return [...tiered, ...extended];
}

async function loadGuideConfig(runtimeConfig) {
  let guideText = "";
  let loadedFromFile = false;

  try {
    guideText = await fs.readFile(runtimeConfig.guidePath, "utf8");
    loadedFromFile = true;
  } catch (error) {
    guideText = "";
  }

  return {
    loadedFromFile,
    guideText,
    guidePath: runtimeConfig.guidePath,
    tiers: TIER_DEFINITIONS,
    extendedSources: EXTENDED_SOURCES.map(([name, domain]) => ({ name, domain })),
    allSources: flattenSources(),
    includedTopics: INCLUDED_TOPICS,
    excludedTerms: EXCLUDED_TERMS
  };
}

module.exports = {
  loadGuideConfig
};
