/**
 * Safe expression evaluator for math formulas.
 * Supports: +, -, *, /, ^, %, parentheses, and functions.
 * Variables are referenced by name (A, B, C, ...).
 *
 * Grammar (recursive descent):
 *   expr     -> term (('+' | '-') term)*
 *   term     -> power (('*' | '/' | '%') power)*
 *   power    -> unary ('^' unary)*
 *   unary    -> ('-' unary) | call
 *   call     -> IDENT '(' args ')' | primary
 *   primary  -> NUMBER | IDENT | '(' expr ')'
 */

type Vars = Record<string, number>;

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  log: Math.log10,
  ln: Math.log,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  pi: () => Math.PI,
  e: () => Math.E,
};

class Parser {
  private pos = 0;
  private input: string;
  private vars: Vars;

  constructor(input: string, vars: Vars) {
    this.input = input.replace(/\s+/g, '');
    this.vars = vars;
  }

  parse(): number {
    const result = this.expr();
    if (this.pos < this.input.length) {
      throw new Error(`Unexpected character: ${this.input[this.pos]}`);
    }
    return result;
  }

  private peek(): string {
    return this.input[this.pos] || '';
  }

  private consume(ch: string): void {
    if (this.input[this.pos] !== ch) {
      throw new Error(`Expected '${ch}' at position ${this.pos}`);
    }
    this.pos++;
  }

  private expr(): number {
    let left = this.term();
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.input[this.pos++];
      const right = this.term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private term(): number {
    let left = this.power();
    while (this.peek() === '*' || this.peek() === '/' || this.peek() === '%') {
      const op = this.input[this.pos++];
      const right = this.power();
      if (op === '*') left *= right;
      else if (op === '/') left = right === 0 ? NaN : left / right;
      else left = right === 0 ? NaN : left % right;
    }
    return left;
  }

  private power(): number {
    let base = this.unary();
    while (this.peek() === '^') {
      this.pos++;
      const exp = this.unary();
      base = Math.pow(base, exp);
    }
    return base;
  }

  private unary(): number {
    if (this.peek() === '-') {
      this.pos++;
      return -this.unary();
    }
    return this.call();
  }

  private call(): number {
    // Check if current position starts with an identifier
    const start = this.pos;
    let name = '';
    while (/[a-zA-Z_]/.test(this.peek())) {
      name += this.input[this.pos++];
    }

    if (name && this.peek() === '(') {
      // Function call
      const fn = FUNCTIONS[name.toLowerCase()];
      if (!fn) throw new Error(`Unknown function: ${name}`);
      this.consume('(');
      const args: number[] = [];
      if (this.peek() !== ')') {
        args.push(this.expr());
        while (this.peek() === ',') {
          this.pos++;
          args.push(this.expr());
        }
      }
      this.consume(')');
      return fn(...args);
    }

    if (name) {
      // Variable reference
      const upperName = name.toUpperCase();
      if (upperName in this.vars) {
        return this.vars[upperName];
      }
      // Also check lowercase
      if (name.toLowerCase() in this.vars) {
        return this.vars[name.toLowerCase()];
      }
      throw new Error(`Unknown variable: ${name}`);
    }

    // Reset position if no identifier was found
    this.pos = start;
    return this.primary();
  }

  private primary(): number {
    if (this.peek() === '(') {
      this.consume('(');
      const val = this.expr();
      this.consume(')');
      return val;
    }

    // Number literal
    const start = this.pos;
    let hasDecimal = false;
    while (/[0-9]/.test(this.peek()) || (this.peek() === '.' && !hasDecimal)) {
      if (this.peek() === '.') hasDecimal = true;
      this.pos++;
    }
    if (this.pos === start) {
      throw new Error(`Unexpected character: ${this.peek() || 'end of input'}`);
    }
    return parseFloat(this.input.slice(start, this.pos));
  }
}

export function evaluateFormula(
  formula: string,
  vars: Vars
): { value: number; error: string | null } {
  try {
    // Strip leading '=' if present (Excel-style)
    const expr = formula.startsWith('=') ? formula.slice(1) : formula;
    if (!expr.trim()) return { value: 0, error: null };
    const parser = new Parser(expr, vars);
    const value = parser.parse();
    return { value: isFinite(value) ? value : NaN, error: null };
  } catch (e) {
    return { value: NaN, error: (e as Error).message };
  }
}

/** List available function names for autocomplete/help display */
export const AVAILABLE_FUNCTIONS = Object.keys(FUNCTIONS);
