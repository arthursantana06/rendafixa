// ============================================================
// FORMULA PARSER - Mathematical Expression Evaluator
// ============================================================

type TokenType = 'NUMBER' | 'PLUS' | 'MINUS' | 'MULTIPLY' | 'DIVIDE' | 'POWER' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'IDENTIFIER' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < input.length) {
    const char = input[i];
    
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    if (char === '+') {
      tokens.push({ type: 'PLUS', value: char });
      i++;
      continue;
    }
    if (char === '-') {
      tokens.push({ type: 'MINUS', value: char });
      i++;
      continue;
    }
    if (char === '*') {
      if (i + 1 < input.length && input[i + 1] === '*') {
        tokens.push({ type: 'POWER', value: '**' });
        i += 2;
      } else {
        tokens.push({ type: 'MULTIPLY', value: char });
        i++;
      }
      continue;
    }
    if (char === '/') {
      tokens.push({ type: 'DIVIDE', value: char });
      i++;
      continue;
    }
    if (char === '^') {
      tokens.push({ type: 'POWER', value: char });
      i++;
      continue;
    }
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: char });
      i++;
      continue;
    }
    
    // Number: match digits, decimal point
    if (/\d/.test(char) || char === '.') {
      let numStr = '';
      while (i < input.length && (/[0-9\.]/.test(input[i]))) {
        numStr += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }
    
    // Identifiers (functions or variable names)
    if (/[a-zA-Z_]/.test(char)) {
      let idStr = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        idStr += input[i];
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value: idStr });
      continue;
    }
    
    throw new Error(`Caractere inválido na fórmula: '${char}'`);
  }
  
  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private current = 0;
  private variables: Record<string, number>;

  constructor(tokens: Token[], variables: Record<string, number> = {}) {
    this.tokens = tokens;
    this.variables = variables;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  public parse(): number {
    const val = this.expression();
    if (!this.isAtEnd()) {
      throw new Error(`Sintaxe extra detectada após o fim da expressão: '${this.peek().value}'`);
    }
    return val;
  }

  private expression(): number {
    let expr = this.term();
    while (this.match('PLUS', 'MINUS')) {
      const operator = this.tokens[this.current - 1];
      const right = this.term();
      if (operator.type === 'PLUS') {
        expr += right;
      } else {
        expr -= right;
      }
    }
    return expr;
  }

  private term(): number {
    let expr = this.factor();
    while (this.match('MULTIPLY', 'DIVIDE')) {
      const operator = this.tokens[this.current - 1];
      const right = this.factor();
      if (operator.type === 'MULTIPLY') {
        expr *= right;
      } else {
        if (right === 0) throw new Error("Erro: Divisão por zero.");
        expr /= right;
      }
    }
    return expr;
  }

  private factor(): number {
    let expr = this.primary();
    while (this.match('POWER')) {
      const right = this.primary();
      expr = Math.pow(expr, right);
    }
    return expr;
  }

  private primary(): number {
    if (this.match('MINUS')) {
      return -this.primary();
    }
    if (this.match('PLUS')) {
      return this.primary();
    }
    
    if (this.match('NUMBER')) {
      return parseFloat(this.tokens[this.current - 1].value);
    }

    if (this.check('IDENTIFIER')) {
      const idToken = this.advance();
      const id = idToken.value;

      // check if function
      if (this.check('LPAREN')) {
        this.consume('LPAREN', "Esperado '(' após função.");
        const args: number[] = [];
        if (!this.check('RPAREN')) {
          args.push(this.expression());
          while (this.match('COMMA')) {
            args.push(this.expression());
          }
        }
        this.consume('RPAREN', "Esperado ')' após argumentos.");

        const func = id.toLowerCase();
        if (func === 'log') {
          if (args.length !== 1) throw new Error("log() requer exatamente 1 argumento.");
          return Math.log10(args[0]);
        }
        if (func === 'ln') {
          if (args.length !== 1) throw new Error("ln() requer exatamente 1 argumento.");
          return Math.log(args[0]);
        }
        if (func === 'abs') {
          if (args.length !== 1) throw new Error("abs() requer exatamente 1 argumento.");
          return Math.abs(args[0]);
        }
        if (func === 'sqrt') {
          if (args.length !== 1) throw new Error("sqrt() requer exatamente 1 argumento.");
          if (args[0] < 0) throw new Error("Não é possível tirar raiz de número negativo.");
          return Math.sqrt(args[0]);
        }
        if (func === 'min') {
          if (args.length < 1) throw new Error("min() requer pelo menos 1 argumento.");
          return Math.min(...args);
        }
        if (func === 'max') {
          if (args.length < 1) throw new Error("max() requer pelo menos 1 argumento.");
          return Math.max(...args);
        }

        throw new Error(`Função desconhecida: ${id}()`);
      }

      // It's a variable
      if (this.variables.hasOwnProperty(id)) {
        return this.variables[id];
      }
      
      throw new Error(`Variável ou função não reconhecida: '${id}'`);
    }

    if (this.match('LPAREN')) {
      const val = this.expression();
      this.consume('RPAREN', "Esperado ')' fechando parênteses.");
      return val;
    }

    throw new Error(`Token inesperado: '${this.peek().value}'`);
  }
}

/**
 * Safely evaluates a mathematical formula with given variables.
 * Throws an error if formula is invalid or division by zero occurs.
 */
export function evaluateFormula(formula: string, variables: Record<string, number> = {}): number {
  if (!formula || formula.trim() === '') {
    throw new Error("Fórmula vazia.");
  }
  const tokens = tokenize(formula);
  const parser = new Parser(tokens, variables);
  const result = parser.parse();
  if (isNaN(result) || !isFinite(result)) {
    throw new Error("Resultado indeterminado ou infinito.");
  }
  return result;
}

/**
 * Validates a formula syntax and returns null if valid, or an error string if invalid.
 */
export function validateFormulaSyntax(formula: string, allowedVariables: string[]): string | null {
  try {
    const dummyVars: Record<string, number> = {};
    for (const v of allowedVariables) {
      dummyVars[v] = 1; // set dummy value
    }
    evaluateFormula(formula, dummyVars);
    return null;
  } catch (err: any) {
    return err.message || "Erro de sintaxe desconhecido.";
  }
}
