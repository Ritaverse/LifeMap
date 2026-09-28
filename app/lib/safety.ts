export type SafetyCategory =
  | "immediate-danger"
  | "medical-emergency"
  | "medical"
  | "legal"
  | "financial"
  | "fertility"
  | "mortality";

export interface SafetyBoundary {
  category: SafetyCategory;
  urgent: boolean;
  eyebrow: string;
  title: string;
  message: string;
  nextSteps: string[];
}

const patterns: Array<{ category: SafetyCategory; pattern: RegExp }> = [
  {
    category: "immediate-danger",
    pattern: /\b(suicid(?:e|al)|kill myself|hurt myself|self[- ]?harm|want to die|wish I (?:was|were) dead|don['’]?t want to (?:live|be alive)|end my life|take my life|plan(?:ning)? to die|in (?:immediate )?danger|i am not safe|someone (?:will|wants to|is trying to) (?:kill|hurt) me|domestic (?:violence|abuse)|abusive partner|partner (?:hits|hurts|abuses) me)\b|自杀|我?想死|不想活|活不下去|结束(?:我的)?生命|杀了自己|伤害自己|自残|立即危险|我.{0,4}不安全|有人.{0,8}(?:杀|伤害|打)我|伴侣.{0,8}(?:打|伤害|虐待)我|家暴|家庭暴力|被伴侣打|被虐待/i,
  },
  {
    category: "medical-emergency",
    pattern: /\b(chest pain|can(?:not|'t) breathe|difficulty breathing|overdose|seizure|uncontrolled bleeding|medical emergency|go to (?:the )?(?:e\.?r\.?|emergency room)|need (?:an )?ambulance)\b|胸痛|呼吸困难|喘不过气|药物过量|抽搐|大出血|急诊|医疗紧急|叫救护车/i,
  },
  {
    category: "fertility",
    pattern: /\b(pregnan(?:t|cy)|fertility|infertility|conceive|ivf|miscarriage|abortion|unborn baby|have (?:a baby|children|kids)|get pregnant)\b|怀孕|备孕|生育|不孕|试管|流产|堕胎|胎儿|能不能生|能否生育|会有孩子吗/i,
  },
  {
    category: "mortality",
    pattern: /\b(when will .*die|will .*die|am i (?:going to )?die|death date|life ?span|how long .*live|predict .*death)\b|什么时候死|会不会死|我要死了吗|死亡时间|寿命|能活多久|预测死亡/i,
  },
  {
    category: "medical",
    pattern: /\b(diagnos(?:e|is)|symptom|medicine|medication|dosage|cancer|heart attack|stroke|mental health|depression|anxiety disorder|medical advice|treatment|should i see a doctor|is this illness)\b|诊断|症状|药物|用药|剂量|癌症|心脏病|中风|抑郁症|焦虑症|医疗建议|治疗|要不要看医生|这是什么病/i,
  },
  {
    category: "legal",
    pattern: /\b(legal advice|legal rights|lawsuit|sue|arrested|criminal charge|immigration law|visa advice|custody|divorce law|contract dispute|sign (?:this|the|a) (?:contract|agreement)|eviction|deportation|court deadline)\b|法律建议|法律权利|诉讼|起诉|被捕|刑事|移民法|签证建议|监护权|离婚法律|合同纠纷|该不该签.{0,6}(?:合同|协议)|驱逐|遣返|法庭期限/i,
  },
  {
    category: "financial",
    pattern: /\b(financial advice|invest(?:ment|ing)?|buy (?:this )?(?:stock|crypto)|sell (?:my )?(?:stock|crypto)|stock|crypto|loan|mortgage|bankruptcy|tax advice|gambl(?:e|ing)|lottery|guaranteed return|life savings|retirement money|can i afford)\b|财务建议|投资|股票|加密货币|贷款|房贷|破产|税务建议|赌博|彩票|保证收益|全部积蓄|退休金|买得起|发财/i,
  },
];

const boundaries: Record<SafetyCategory, SafetyBoundary> = {
  "immediate-danger": {
    category: "immediate-danger",
    urgent: true,
    eyebrow: "IMMEDIATE SUPPORT · 立即支持",
    title: "这件事需要真人与现实中的及时支持",
    message: "Life Map 不能评估紧急危险，也不会用命盘回答自伤、他伤或安全风险。",
    nextSteps: ["如果你或他人正处于立即危险，请现在联系当地紧急服务。", "尽快联系你信任的人，并尽量不要独自面对。", "如果可以，前往最近的急诊、危机中心或安全地点。"],
  },
  "medical-emergency": {
    category: "medical-emergency",
    urgent: true,
    eyebrow: "MEDICAL EMERGENCY · 医疗紧急情况",
    title: "这些情况需要现实中的即时医疗判断",
    message: "Life Map 不能判断胸痛、呼吸困难、药物过量、严重出血或其他紧急症状，也不会用命盘决定是否就医。",
    nextSteps: ["如果症状正在发生，请立即联系当地紧急服务或前往最近的急诊。", "尽量请身边可信任的人陪同，并向医护人员如实说明症状与用药。"],
  },
  medical: {
    category: "medical",
    urgent: false,
    eyebrow: "HEALTH BOUNDARY · 健康边界",
    title: "健康问题不适合用命盘判断",
    message: "Life Map 不能诊断疾病、判断症状、推荐药物或预测治疗结果。",
    nextSteps: ["请向合格的医生或当地医疗服务说明具体症状。", "如症状突然、严重或正在恶化，请联系当地急救服务。"],
  },
  legal: {
    category: "legal",
    urgent: false,
    eyebrow: "LEGAL BOUNDARY · 法律边界",
    title: "法律后果需要专业、属地化的判断",
    message: "Life Map 不能解释你的法律权利、期限或案件结果，也不会预测胜诉与否。",
    nextSteps: ["请联系你所在地区的律师、法律援助机构或相关政府部门。", "保存合同、通知、日期和其他原始文件，供专业人士核对。"],
  },
  financial: {
    category: "financial",
    urgent: false,
    eyebrow: "FINANCIAL BOUNDARY · 财务边界",
    title: "不使用命盘决定投资或重大财务行动",
    message: "Life Map 不能预测收益、市场、彩票或财务结果，也不提供投资、税务或债务建议。",
    nextSteps: ["先核对金额、期限、损失承受能力与书面条款。", "重大决定请咨询有资质、承担受托责任的专业人士。"],
  },
  fertility: {
    category: "fertility",
    urgent: false,
    eyebrow: "FERTILITY BOUNDARY · 生育边界",
    title: "生育与妊娠不能由命盘预测",
    message: "Life Map 不判断能否怀孕、胎儿健康、流产风险、生产时间或治疗结果。",
    nextSteps: ["请向妇产科、助产士或生殖医学专业人士咨询。", "如有出血、剧痛或其他紧急症状，请立即联系当地医疗服务。"],
  },
  mortality: {
    category: "mortality",
    urgent: false,
    eyebrow: "MORTALITY BOUNDARY · 生命边界",
    title: "我们不会预测死亡或寿命",
    message: "命理与占星不能可靠判断死亡时间、寿命或他人的生死结果。",
    nextSteps: ["如果问题来自健康担忧，请联系医疗专业人士。", "如果问题来自悲伤、恐惧或失去，请联系可信任的人或当地心理支持服务。"],
  },
};

export function classifySafetyConcern(input: string): SafetyBoundary | null {
  const normalized = input.trim();
  if (!normalized) return null;
  const matched = patterns.find(({ pattern }) => pattern.test(normalized));
  return matched ? boundaries[matched.category] : null;
}
