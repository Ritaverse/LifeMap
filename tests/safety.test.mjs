import assert from "node:assert/strict";
import test from "node:test";
import { classifySafetyConcern } from "../app/lib/safety.ts";

const cases = [
  ["我不想活了，想伤害自己", "immediate-danger"],
  ["I want to die and I am going to end my life tonight", "immediate-danger"],
  ["我的伴侣一直打我，我现在不安全", "immediate-danger"],
  ["I have chest pain and cannot breathe. Should I go to the ER?", "medical-emergency"],
  ["Can this chart diagnose my symptoms?", "medical"],
  ["这场合同纠纷我会胜诉吗？", "legal"],
  ["Should I sign this contract tomorrow?", "legal"],
  ["Which crypto investment will guarantee returns?", "financial"],
  ["Should I invest my life savings in this stock?", "financial"],
  ["我的命盘能看出什么时候怀孕吗？", "fertility"],
  ["Will I be able to have children?", "fertility"],
  ["Can astrology predict my death date?", "mortality"],
];

for (const [input, category] of cases) {
  test(`routes ${category} questions to a safety boundary`, () => {
    const result = classifySafetyConcern(input);
    assert.equal(result?.category, category);
    assert.ok(result?.message);
    assert.ok(result?.nextSteps.length);
  });
}

test("ordinary reflection questions remain available", () => {
  assert.equal(classifySafetyConcern("我该如何在关系里说清自己的边界？"), null);
  assert.equal(classifySafetyConcern("What should I reflect on in my career?"), null);
});
