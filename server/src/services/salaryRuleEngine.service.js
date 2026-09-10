const { create, all } = require('mathjs');
const prisma = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// Create a restricted mathjs instance for safe expression evaluation
const math = create(all);
math.import({
  equal: function(a, b) {
    return a === b || a == b;
  },
  unequal: function(a, b) {
    return a !== b && a != b;
  }
}, { override: true });

const limitedScope = {
  // Only expose safe math functions
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  max: Math.max,
  min: Math.min,
};

class SalaryRuleEngineService {
  /**
   * Evaluate all salary rules for a structure against a given context.
   * This is a PURE FUNCTION — no DB writes, fully unit-testable.
   *
   * @param {Array} rules - Ordered array of salary rules (from SalaryStructureRule join)
   * @param {Object} context - Evaluation context { BASIC, employee, contract, attendance, leave, ... }
   * @returns {Object} { lines: PayslipLine[], grossSalary, totalDeductions, netSalary }
   */
  evaluate(rules, context) {
    const lines = [];
    const computedValues = { ...context };

    // Sort rules by sequence (sequenceOverride ?? salaryRule.sequence)
    const sortedRules = [...rules].sort((a, b) => {
      const seqA = a.sequenceOverride ?? a.salaryRule?.sequence ?? a.sequence;
      const seqB = b.sequenceOverride ?? b.salaryRule?.sequence ?? b.sequence;
      return seqA - seqB;
    });

    // Pre-populate all rule codes with 0 so formulas referencing conditionally skipped rules won't fail with undefined symbol
    for (const ruleEntry of sortedRules) {
      const rule = ruleEntry.salaryRule || ruleEntry;
      if (rule.code && computedValues[rule.code] === undefined) {
        computedValues[rule.code] = 0;
      }
    }

    for (const ruleEntry of sortedRules) {
      const rule = ruleEntry.salaryRule || ruleEntry;

      if (!rule.active) continue;

      // Evaluate condition expression
      if (rule.conditionExpr) {
        try {
          const conditionResult = this.safeEval(rule.conditionExpr, computedValues);
          if (!conditionResult) continue; // Skip this rule
        } catch (err) {
          console.warn(`[RuleEngine] Condition eval failed for ${rule.code}: ${err.message}`);
          continue;
        }
      }

      let amount = 0;

      try {
        switch (rule.computationType) {
          case 'FIXED':
            if ((rule.code === 'BASIC' || rule.category === 'BASIC') && (context.BASIC !== undefined || context.contract?.basicWage !== undefined)) {
              amount = parseFloat(context.BASIC ?? context.contract?.basicWage ?? 0);
            } else {
              amount = parseFloat(rule.fixedAmount) || 0;
            }
            break;

          case 'PERCENTAGE': {
            const baseValue = computedValues[rule.percentageOfCode];
            if (baseValue === undefined) {
              console.warn(`[RuleEngine] Base code ${rule.percentageOfCode} not found for rule ${rule.code}`);
              amount = 0;
            } else {
              amount = parseFloat(baseValue) * (parseFloat(rule.percentageValue) / 100);
            }
            break;
          }

          case 'FORMULA':
            amount = this.safeEval(rule.formula, computedValues);
            break;

          default:
            console.warn(`[RuleEngine] Unknown computation type: ${rule.computationType}`);
            amount = 0;
        }
      } catch (err) {
        console.error(`[RuleEngine] Computation failed for rule ${rule.code}: ${err.message}`);
        amount = 0;
      }

      // Round to 2 decimal places
      amount = Math.round(amount * 100) / 100;

      // Store computed value for later rules to reference
      computedValues[rule.code] = amount;

      lines.push({
        salaryRuleId: rule.id,
        ruleCode: rule.code,
        label: rule.name,
        amount,
        sequence: ruleEntry.sequenceOverride ?? rule.sequence,
        category: rule.category,
        isDeduction: rule.isDeduction,
      });
    }

    // Calculate totals
    const grossSalary = lines
      .filter((l) => ['BASIC', 'ALLOWANCE', 'GROSS'].includes(l.category) && !l.isDeduction)
      .reduce((sum, l) => sum + l.amount, 0);

    const totalDeductions = lines
      .filter((l) => l.isDeduction || l.category === 'DEDUCTION')
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);

    let netSalary = grossSalary - totalDeductions;

    // Clamp net at 0 — never emit a negative paycheck
    const warnings = [];
    if (netSalary < 0) {
      warnings.push('Net salary would be negative — clamped to 0');
      netSalary = 0;
    }

    return {
      lines,
      grossSalary: Math.round(grossSalary * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      computedValues,
      warnings,
    };
  }

  /**
   * Safely evaluate a formula/expression string against a context.
   * Uses mathjs with a restricted scope — NEVER uses eval() or Function().
   */
  safeEval(expression, context) {
    try {
      // Build a safe scope from context
      const scope = { ...limitedScope };
      for (const [key, value] of Object.entries(context)) {
        if (typeof value === 'number' || typeof value === 'boolean') {
          scope[key] = value;
        } else if (typeof value === 'string') {
          const num = parseFloat(value);
          scope[key] = isNaN(num) ? value : num;
        }
      }

      // Handle nested property access (e.g., employee.employmentType == 'FULL_TIME')
      // by flattening the context
      if (context.employee && typeof context.employee === 'object') {
        for (const [key, value] of Object.entries(context.employee)) {
          if (typeof value === 'string' || typeof value === 'number') {
            scope[`employee_${key}`] = value;
          }
        }
      }

      // Replace dot notation with underscore for mathjs compatibility
      let safeExpr = expression
        .replace(/employee\.(\w+)/g, 'employee_$1')
        .replace(/contract\.(\w+)/g, 'contract_$1')
        .replace(/attendance\.(\w+)/g, 'attendance_$1')
        .replace(/leave\.(\w+)/g, 'leave_$1');

      const result = math.evaluate(safeExpr, scope);
      if (typeof result === 'boolean') return result;
      return typeof result === 'number' ? result : parseFloat(result) || 0;
    } catch (err) {
      throw new Error(`Expression evaluation failed: ${expression} — ${err.message}`);
    }
  }

  /**
   * Validate a salary rule's dependencies at save time.
   * Ensures percentageOfCode/formula references point to earlier-sequence, active rules.
   */
  async validateDependencies(rule, existingRules) {
    const errors = [];

    if (rule.computationType === 'PERCENTAGE' && rule.percentageOfCode) {
      const baseRule = existingRules.find(
        (r) => r.code === rule.percentageOfCode && r.active
      );
      if (!baseRule) {
        errors.push(`percentageOfCode '${rule.percentageOfCode}' references an unknown or inactive rule`);
      } else if (baseRule.sequence >= rule.sequence) {
        errors.push(
          `percentageOfCode '${rule.percentageOfCode}' (seq ${baseRule.sequence}) must have an earlier sequence than '${rule.code}' (seq ${rule.sequence})`
        );
      }
    }

    if (rule.computationType === 'FORMULA' && rule.formula) {
      // Extract referenced codes from the formula
      const referencedCodes = this.extractReferences(rule.formula);
      for (const refCode of referencedCodes) {
        const refRule = existingRules.find((r) => r.code === refCode && r.active);
        if (refRule && refRule.sequence >= rule.sequence) {
          errors.push(
            `Formula references '${refCode}' (seq ${refRule.sequence}) which does not have an earlier sequence than '${rule.code}' (seq ${rule.sequence})`
          );
        }
      }
    }

    return errors;
  }

  /**
   * Extract code references from a formula expression.
   */
  extractReferences(formula) {
    // Match uppercase identifiers that look like rule codes
    const matches = formula.match(/\b([A-Z][A-Z_0-9]+)\b/g);
    return [...new Set(matches || [])];
  }

  /**
   * Test a rule against sample inputs (dry-run).
   */
  testRule(rule, sampleContext) {
    const mockRuleEntry = {
      salaryRule: {
        ...rule,
        id: 'test',
        active: true,
      },
      sequenceOverride: null,
    };

    try {
      const result = this.evaluate([mockRuleEntry], sampleContext);
      return {
        success: true,
        amount: result.lines[0]?.amount || 0,
        context: result.computedValues,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = new SalaryRuleEngineService();
