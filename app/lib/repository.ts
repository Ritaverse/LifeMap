import { askResponses, domains, facts, iching, insights, products, recommendation, timing } from "./data.ts";
import type { AskResponse, DomainId, EvidenceRef } from "./types";

export function getInsight(id: string) {
  return insights.find((item) => item.id === id) ?? insights[0];
}

export function getDomain(id: string) {
  return domains.find((item) => item.id === id) ?? domains[0];
}

export function getProduct(idOrSlug: string) {
  return products.find((item) => item.id === idOrSlug || item.slug === idOrSlug) ?? products[0];
}

export function resolveEvidence(evidence: EvidenceRef[]) {
  return evidence.map((reference) => {
    const fact = facts.find((item) => item.id === reference.factId);
    if (!fact) throw new Error(`Missing demo fact: ${reference.factId}`);
    if (fact.system !== reference.system) throw new Error(`Evidence system mismatch: ${reference.factId}`);
    return { ...reference, fact };
  });
}

export function routeAsk(input: string): AskResponse {
  const normalized = input.toLowerCase();
  const category =
    /career|work|job|工作|职业|换工作/.test(normalized) ? "career-transition" :
    /relationship|partner|关系|感情|冲突/.test(normalized) ? "relationship-pattern" :
    /start|new|begin|开始|新项目/.test(normalized) ? "new-beginning" :
    /conflict|contradiction|矛盾|拉扯/.test(normalized) ? "internal-tension" : "general";
  return askResponses.find((item) => item.category === category) ?? askResponses[askResponses.length - 1];
}

export function validateFixtures() {
  insights.forEach((insight) => resolveEvidence(insight.evidence));
  domains.forEach((domain) => {
    if (!insights.some((insight) => insight.id === domain.insightId)) throw new Error(`Missing insight: ${domain.insightId}`);
  });
  if (!products.some((product) => product.id === recommendation.productId)) throw new Error("Missing recommended product");
  recommendation.reasons.forEach((reason) => {
    if (reason.factId && !facts.some((fact) => fact.id === reason.factId)) throw new Error(`Missing recommendation fact: ${reason.factId}`);
  });
  if (iching.lines.map((line) => line.position).join(",") !== "1,2,3,4,5,6") throw new Error("I Ching lines must be bottom-to-top");
  return true;
}

export const lifeMapRepository = {
  facts,
  insights,
  domains,
  timing,
  products,
  recommendation,
  iching,
  getInsight,
  getDomain: (id: DomainId) => getDomain(id),
  getProduct,
  resolveEvidence,
  ask: routeAsk,
};
