// [0] Kiểm tra điều kiện của sự kiện, Focus, luật cảnh, modifier có điều kiện (GDD 02 §4.2)
// Bộ đánh giá không biết gì về trạng thái game — mọi tra cứu đi qua Resolver.
import type { Condition, Primitive } from '@content/schemas/condition';

export interface Resolver {
  /** Lấy giá trị biến theo đường dẫn ('character.age', 'household.money'...). Đường dẫn lạ phải ném lỗi. */
  get(path: string): Primitive | undefined;
  hasTrait(who: string, traitId: string): boolean;
  hasFlag(flag: string): boolean;
  propertyCount(propertyId: string): number;
  roleExists(roleId: string): boolean;
}

export class UnknownVariableError extends Error {
  constructor(public readonly path: string) {
    super(`Biến không tồn tại trong DSL điều kiện: "${path}"`);
    this.name = 'UnknownVariableError';
  }
}

function compare(left: Primitive | undefined, op: string, right: Primitive | Primitive[]): boolean {
  if (left === undefined) return false;
  switch (op) {
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '>':
      return typeof left === 'number' && left > (right as number);
    case '>=':
      return typeof left === 'number' && left >= (right as number);
    case '<':
      return typeof left === 'number' && left < (right as number);
    case '<=':
      return typeof left === 'number' && left <= (right as number);
    case 'between': {
      const [lo, hi] = right as number[];
      return typeof left === 'number' && left >= lo && left <= hi;
    }
    case 'in':
      return (right as Primitive[]).includes(left);
    default:
      return false;
  }
}

export function evaluate(cond: Condition | undefined, r: Resolver): boolean {
  if (!cond) return true;
  if ('all' in cond) return cond.all.every((c) => evaluate(c, r));
  if ('any' in cond) return cond.any.some((c) => evaluate(c, r));
  if ('not' in cond) return !evaluate(cond.not, r);
  if ('var' in cond) return compare(r.get(cond.var), cond.op, cond.value);
  if ('has_trait' in cond) return r.hasTrait(cond.who ?? 'player', cond.has_trait);
  if ('has_flag' in cond) return r.hasFlag(cond.has_flag);
  if ('has_property' in cond) return r.propertyCount(cond.has_property) >= (cond.min ?? 1);
  if ('role' in cond) return r.roleExists(cond.role) === cond.exists;
  return false;
}

/** Duyệt mọi đường dẫn biến trong điều kiện (dùng cho công cụ kiểm tra nội dung). */
export function collectVariables(cond: Condition | undefined, out: Set<string> = new Set()): Set<string> {
  if (!cond) return out;
  if ('all' in cond) cond.all.forEach((c) => collectVariables(c, out));
  else if ('any' in cond) cond.any.forEach((c) => collectVariables(c, out));
  else if ('not' in cond) collectVariables(cond.not, out);
  else if ('var' in cond) out.add(cond.var);
  return out;
}
