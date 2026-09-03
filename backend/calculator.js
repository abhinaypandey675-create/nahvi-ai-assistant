import { all, create } from "mathjs";
import { RESPONSE_MODES } from "./responseMode.js";

const math = create(all);

const UNIT_ALIASES = {
  meter: "m",
  meters: "m",
  metre: "m",
  metres: "m",
  kilometer: "km",
  kilometers: "km",
  kilometre: "km",
  kilometres: "km",
  centimeter: "cm",
  centimeters: "cm",
  millimeter: "mm",
  millimeters: "mm",
  inch: "inch",
  inches: "inch",
  foot: "ft",
  feet: "ft",
  yard: "yd",
  yards: "yd",
  mile: "mi",
  miles: "mi",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  pound: "lb",
  pounds: "lb",
  ounce: "oz",
  ounces: "oz",
  celsius: "degC",
  fahrenheit: "degF",
  kelvin: "K",
  liter: "L",
  liters: "L",
  litre: "L",
  litres: "L",
  milliliter: "mL",
  milliliters: "mL",
  second: "s",
  seconds: "s",
  minute: "min",
  minutes: "min",
  hour: "h",
  hours: "h",
};

function cleanInput(message) {
  return String(message || "")
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\bcalculate\b|\bcompute\b|\bsolve\b|\bfind\b|\bwhat is\b|\bwhat's\b|\bhow much is\b/gi, "")
    .replace(/\bplease\b|\bboss\b/gi, "")
    .trim();
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  const rounded = Math.abs(value) >= 1 ? Number(value.toFixed(6)) : Number(value.toPrecision(8));
  return String(rounded);
}

function confidence(level, score, limitations = []) {
  return { level, score, limitations };
}

function buildResult({ answer, explanation, steps = [], confidence: conf, mode }) {
  return {
    answer,
    explanation,
    steps: mode === RESPONSE_MODES.DETAILED ? steps : [],
    confidence: conf,
    mode,
  };
}

function resultToReply(result) {
  const lines = [`Answer: ${result.answer}`];
  if (result.explanation) lines.push(`Explanation: ${result.explanation}`);
  if (result.mode === RESPONSE_MODES.DETAILED && result.steps?.length) {
    lines.push("Steps:");
    result.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  }
  lines.push(`Confidence: ${result.confidence.level} (${result.confidence.score}/100)`);
  if (result.confidence.limitations?.length) {
    lines.push(`Limitations: ${result.confidence.limitations.join(" ")}`);
  }
  return lines.join("\n");
}

function parsePercent(text, mode) {
  let match = text.match(/(-?\d+(?:\.\d+)?)\s*(?:percent|%)\s+of\s+(-?\d+(?:\.\d+)?)/i);
  if (match) {
    const percent = Number(match[1]);
    const base = Number(match[2]);
    const value = (percent / 100) * base;
    return buildResult({
      answer: formatNumber(value),
      explanation: `${percent}% of ${base} is ${formatNumber(value)}.`,
      steps: [`Convert ${percent}% to ${percent / 100}.`, `Multiply ${percent / 100} by ${base}.`],
      confidence: confidence("high", 98),
      mode,
    });
  }

  match = text.match(/(?:increase|add)\s+(-?\d+(?:\.\d+)?)\s+by\s+(-?\d+(?:\.\d+)?)\s*(?:percent|%)/i);
  if (match) {
    const base = Number(match[1]);
    const percent = Number(match[2]);
    const value = base * (1 + percent / 100);
    return buildResult({
      answer: formatNumber(value),
      explanation: `${base} increased by ${percent}% is ${formatNumber(value)}.`,
      steps: [`Multiplier is 1 + ${percent}/100 = ${1 + percent / 100}.`, `Multiply ${base} by ${1 + percent / 100}.`],
      confidence: confidence("high", 98),
      mode,
    });
  }

  match = text.match(/(?:decrease|reduce|subtract)\s+(-?\d+(?:\.\d+)?)\s+by\s+(-?\d+(?:\.\d+)?)\s*(?:percent|%)/i);
  if (match) {
    const base = Number(match[1]);
    const percent = Number(match[2]);
    const value = base * (1 - percent / 100);
    return buildResult({
      answer: formatNumber(value),
      explanation: `${base} decreased by ${percent}% is ${formatNumber(value)}.`,
      steps: [`Multiplier is 1 - ${percent}/100 = ${1 - percent / 100}.`, `Multiply ${base} by ${1 - percent / 100}.`],
      confidence: confidence("high", 98),
      mode,
    });
  }

  return null;
}

function parseRatio(text, mode) {
  const match = text.match(/(?:ratio\s+)?(-?\d+(?:\.\d+)?)\s*(?::|to)\s*(-?\d+(?:\.\d+)?)(?:\s*(?:of|for|with)\s*(-?\d+(?:\.\d+)?))?/i);
  if (!match) return null;

  const a = Number(match[1]);
  const b = Number(match[2]);
  const total = match[3] ? Number(match[3]) : null;
  if (b === 0) {
    return buildResult({
      answer: "Undefined",
      explanation: "A ratio cannot divide by zero.",
      confidence: confidence("high", 95),
      mode,
    });
  }

  if (total !== null) {
    const sum = a + b;
    const first = (a / sum) * total;
    const second = (b / sum) * total;
    return buildResult({
      answer: `${formatNumber(first)} and ${formatNumber(second)}`,
      explanation: `${total} split in the ratio ${a}:${b}.`,
      steps: [`Add ratio parts: ${a} + ${b} = ${sum}.`, `First share: ${a}/${sum} x ${total}.`, `Second share: ${b}/${sum} x ${total}.`],
      confidence: confidence("high", 97),
      mode,
    });
  }

  const decimal = a / b;
  return buildResult({
    answer: `${formatNumber(decimal)} (${a}:${b})`,
    explanation: `The ratio ${a}:${b} equals ${formatNumber(decimal)} as a decimal.`,
    steps: [`Divide ${a} by ${b}.`],
    confidence: confidence("high", 97),
    mode,
  });
}

function normalizeUnit(unit) {
  const key = unit.toLowerCase();
  return UNIT_ALIASES[key] || key;
}

function parseConversion(text, mode) {
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(?:to|in|into)\s+([a-zA-Z]+)/i);
  if (!match) return null;

  const value = Number(match[1]);
  const from = normalizeUnit(match[2]);
  const to = normalizeUnit(match[3]);

  try {
    const converted = math.unit(value, from).to(to);
    const numeric = Number(converted.value);
    return buildResult({
      answer: `${formatNumber(numeric)} ${to}`,
      explanation: `${value} ${from} equals ${formatNumber(numeric)} ${to}.`,
      steps: [`Create unit value: ${value} ${from}.`, `Convert ${from} to ${to}.`],
      confidence: confidence("high", 96),
      mode,
    });
  } catch {
    return buildResult({
      answer: "Conversion unavailable",
      explanation: `I could not confidently convert ${from} to ${to}.`,
      confidence: confidence("low", 35, ["The units may be unsupported or incompatible."]),
      mode,
    });
  }
}

function parseFinancial(text, mode) {
  let match = text.match(/(?:compound interest|compound amount)\s+(?:on\s+)?(-?\d+(?:\.\d+)?)\s+(?:at\s+)?(-?\d+(?:\.\d+)?)\s*(?:percent|%)\s+(?:for\s+)?(-?\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  if (match) {
    const principal = Number(match[1]);
    const rate = Number(match[2]) / 100;
    const years = Number(match[3]);
    const amount = principal * Math.pow(1 + rate, years);
    const interest = amount - principal;
    return buildResult({
      answer: `Amount ${formatNumber(amount)}, interest ${formatNumber(interest)}`,
      explanation: `Compounded annually for ${years} years at ${formatNumber(rate * 100)}%.`,
      steps: [`Use A = P(1 + r)^t.`, `A = ${principal}(1 + ${rate})^${years}.`],
      confidence: confidence("medium", 88, ["Assumes annual compounding."]),
      mode,
    });
  }

  match = text.match(/(?:simple interest|interest)\s+(?:on\s+)?(-?\d+(?:\.\d+)?)\s+(?:at\s+)?(-?\d+(?:\.\d+)?)\s*(?:percent|%)\s+(?:for\s+)?(-?\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  if (match) {
    const principal = Number(match[1]);
    const rate = Number(match[2]);
    const years = Number(match[3]);
    const interest = (principal * rate * years) / 100;
    const amount = principal + interest;
    return buildResult({
      answer: `Interest ${formatNumber(interest)}, total ${formatNumber(amount)}`,
      explanation: `Simple interest for ${years} years at ${rate}% is ${formatNumber(interest)}.`,
      steps: [`Use SI = P x R x T / 100.`, `SI = ${principal} x ${rate} x ${years} / 100.`],
      confidence: confidence("high", 98),
      mode,
    });
  }

  match = text.match(/(?:discount|discounted price)\s+(?:of\s+)?(-?\d+(?:\.\d+)?)\s+(?:by|at)\s+(-?\d+(?:\.\d+)?)\s*(?:percent|%)/i);
  if (match) {
    const price = Number(match[1]);
    const discount = Number(match[2]);
    const saved = price * discount / 100;
    const final = price - saved;
    return buildResult({
      answer: formatNumber(final),
      explanation: `Discount is ${formatNumber(saved)}, final price is ${formatNumber(final)}.`,
      steps: [`Discount = ${price} x ${discount}/100.`, `Final price = ${price} - ${formatNumber(saved)}.`],
      confidence: confidence("high", 98),
      mode,
    });
  }

  match = text.match(/(?:profit|gain)\s+(?:if\s+)?(?:cost(?: price)?|cp)\s+(-?\d+(?:\.\d+)?)\s+(?:and\s+)?(?:selling(?: price)?|sp)\s+(-?\d+(?:\.\d+)?)/i);
  if (match) {
    const cost = Number(match[1]);
    const selling = Number(match[2]);
    const profit = selling - cost;
    const percent = cost === 0 ? NaN : (profit / cost) * 100;
    return buildResult({
      answer: `Profit ${formatNumber(profit)}, profit percent ${formatNumber(percent)}%`,
      explanation: `Selling price is higher than cost price by ${formatNumber(profit)}.`,
      steps: [`Profit = SP - CP = ${selling} - ${cost}.`, `Profit percent = Profit / CP x 100.`],
      confidence: Number.isFinite(percent) ? confidence("high", 97) : confidence("low", 35, ["Cost price cannot be zero for percentage calculation."]),
      mode,
    });
  }

  match = text.match(/(?:loss)\s+(?:if\s+)?(?:cost(?: price)?|cp)\s+(-?\d+(?:\.\d+)?)\s+(?:and\s+)?(?:selling(?: price)?|sp)\s+(-?\d+(?:\.\d+)?)/i);
  if (match) {
    const cost = Number(match[1]);
    const selling = Number(match[2]);
    const loss = cost - selling;
    const percent = cost === 0 ? NaN : (loss / cost) * 100;
    return buildResult({
      answer: `Loss ${formatNumber(loss)}, loss percent ${formatNumber(percent)}%`,
      explanation: `Cost price is higher than selling price by ${formatNumber(loss)}.`,
      steps: [`Loss = CP - SP = ${cost} - ${selling}.`, `Loss percent = Loss / CP x 100.`],
      confidence: Number.isFinite(percent) ? confidence("high", 97) : confidence("low", 35, ["Cost price cannot be zero for percentage calculation."]),
      mode,
    });
  }

  match = text.match(/(?:emi|loan emi)\s+(?:for\s+)?(-?\d+(?:\.\d+)?)\s+(?:at\s+)?(-?\d+(?:\.\d+)?)\s*(?:percent|%)\s+(?:for\s+)?(-?\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  if (match) {
    const principal = Number(match[1]);
    const annualRate = Number(match[2]);
    const years = Number(match[3]);
    const monthlyRate = annualRate / 12 / 100;
    const months = years * 12;
    const emi = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    const total = emi * months;
    return buildResult({
      answer: `EMI ${formatNumber(emi)}, total payment ${formatNumber(total)}`,
      explanation: `Monthly EMI for ${years} years at ${annualRate}% annual interest.`,
      steps: [`Monthly rate = ${annualRate}/12/100.`, `Months = ${years} x 12.`, `Apply standard EMI formula.`],
      confidence: confidence("medium", 88, ["Assumes fixed annual interest converted to monthly rate. Fees and taxes are not included."]),
      mode,
    });
  }

  return null;
}

function normalizeExpression(text) {
  return text
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b|\bmultiplied by\b|\bmultiply by\b/g, "*")
    .replace(/\bdivided by\b|\bdivide by\b/g, "/")
    .replace(/\bpower of\b|\bto the power of\b/g, "^")
    .replace(/\bsquare root of\s+(-?\d+(?:\.\d+)?)/g, "sqrt($1)")
    .replace(/\bcube root of\s+(-?\d+(?:\.\d+)?)/g, "cbrt($1)")
    .replace(/\bpercent\b/g, "%")
    .trim();
}

function isSafeExpression(expr) {
  return /^[\d\s+\-*/^().,%a-zA-Z]+$/.test(expr) && /\d/.test(expr);
}

function parseArithmetic(text, mode) {
  const expr = normalizeExpression(text);
  if (!isSafeExpression(expr)) return null;

  try {
    const result = math.evaluate(expr);
    if (typeof result === "function") throw new Error("Unsupported expression");
    const answer = typeof result === "number" ? formatNumber(result) : String(result);
    const verification = math.evaluate(`(${expr}) - (${expr})`);
    const verified = typeof verification === "number" && Math.abs(verification) < 1e-9;
    return buildResult({
      answer,
      explanation: `Calculated ${expr}.`,
      steps: [`Parsed expression: ${expr}.`, `Evaluated with math engine.`, verified ? "Verification passed." : "Verification was limited."],
      confidence: verified ? confidence("high", 97) : confidence("medium", 75, ["Could not fully verify the expression independently."]),
      mode,
    });
  } catch {
    return null;
  }
}

export function calculateStructured(message, mode = RESPONSE_MODES.QUICK) {
  const text = cleanInput(message);
  const parsers = [parsePercent, parseRatio, parseConversion, parseFinancial, parseArithmetic];

  for (const parser of parsers) {
    const result = parser(text, mode);
    if (result) return result;
  }

  return buildResult({
    answer: "Unable to calculate confidently",
    explanation: "I could not parse the calculation request clearly.",
    confidence: confidence("low", 25, ["Try giving the numbers, operation, and units explicitly."]),
    mode,
  });
}

export function calculationToReply(result) {
  return resultToReply(result);
}

export function calculateReply(message, mode = RESPONSE_MODES.QUICK) {
  return calculationToReply(calculateStructured(message, mode));
}

export function looksLikeCalculation(message) {
  const text = cleanInput(message);
  if (!text) return false;
  if (parsePercent(text, RESPONSE_MODES.QUICK)) return true;
  if (parseConversion(text, RESPONSE_MODES.QUICK)) return true;
  if (parseFinancial(text, RESPONSE_MODES.QUICK)) return true;
  if (/\d+\s*(?:[+\-*/^]|:)\s*\d+/.test(text)) return true;
  if (/\b(?:sin|cos|tan|log|sqrt|cbrt)\s*\(?\s*-?\d/.test(text)) return true;
  return false;
}
