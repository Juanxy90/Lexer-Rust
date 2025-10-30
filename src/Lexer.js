import Token from './Token.js'
import ErrorHandler from './ErrorHandler.js';

class Lexer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
        this.errors = new ErrorHandler();

        this.keywords = new Set([
            "as", "break", "const", "continue", "crate", "else", "enum", "extern",
            "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod",
            "move", "mut", "pub", "ref", "return", "self", "Self", "static", "struct",
            "super", "trait", "true", "type", "unsafe", "use", "where", "while"
        ]);
    }

    peek(offset = 0) { return this.input[this.pos + offset] || null; }
    advance() {
        const ch = this.input[this.pos++] || null;
        if (ch === '\n') { this.line++; this.col = 1; }
        else this.col++;
        return ch;
    }
    addToken(type, lexeme, startLine, startCol) {
        this.tokens.push(new Token(type, lexeme, startLine, startCol));
    }
    isLetter(ch) { return ch !== null && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ_]/.test(ch); }
    isDigit(ch) { return ch !== null && ch >= '0' && ch <= '9'; }
    isAlnum(ch) { return ch !== null && (this.isLetter(ch) || this.isDigit(ch)); }

    lex() {
        while (this.pos < this.input.length) {
            let ch = this.peek();
            const startLine = this.line, startCol = this.col;

            // Saltos de línea y tabulación

            if (ch === '\\') {
                const next = this.peek(1);
                if (next === 'n') {
                    this.advance(); this.advance();
                    this.addToken('SALTO DE LÍNEA', '\\n', startLine, startCol);
                    continue;
                }
                if (next === 'r') {
                    this.advance(); this.advance();
                    if (this.peek() === '\\' && this.peek(1) === 'n') {
                        this.advance(); this.advance();
                        this.addToken('FINAL DE LÍNEA', '\\r\\n', startLine, startCol);
                    } else {
                        this.addToken('RETORNO DE CARRO', '\\r', startLine, startCol);
                    }
                    continue;
                }
                if (next === 't') {
                    this.advance(); this.advance();
                    this.addToken('TABULACIÓN', '\\t', startLine, startCol);
                    continue;
                }
            }

            if (' \t\r\n'.includes(ch)) { this.advance(); continue; }

            // Comentarios

            if (ch === '/') {
                if (this.peek(1) === '/') {
                    this.advance(); this.advance();
                    let lex = "//";
                    while (this.peek() !== null && this.peek() !== '\n') lex += this.advance();
                    this.addToken('COMENTARIO DE LÍNEA', lex, startLine, startCol);
                    continue;
                }
                if (this.peek(1) === '*') {
                    this.advance(); this.advance();
                    let lex = "/*";
                    let closed = false;
                    while (this.peek() !== null) {
                        const c = this.advance();
                        lex += c;
                        if (c === '*' && this.peek() === '/') {
                            lex += this.advance();
                            closed = true;
                            break;
                        }
                    }
                    if (!closed) this.errors.add("Comentario de bloque sin cerrar", startLine, startCol);
                    else this.addToken('COMENTARIO DE BLOQUE', lex, startLine, startCol);
                    continue;
                }
                this.addToken('OPERADOR ARITMÉTICO', this.advance(), startLine, startCol);
                continue;
            }

            // Rango .. y ..=

            if (ch === '.' && this.peek(1) === '.') {
                if (this.peek(2) === '=') {
                    this.addToken('RANGO INCLUSIVO', '..=', startLine, startCol);
                    this.advance(); this.advance(); this.advance();
                } else {
                    this.addToken('RANGO', '..', startLine, startCol);
                    this.advance(); this.advance();
                }
                continue;
            }

            // Tipos numéricos

            const floatSuffixes = ["f32", "f64"];
            const inum = ["i8", "i16", "i32", "i64", "i128", "isize"];
            const unum = ["u8", "u16", "u32", "u64", "u128", "usize"];
            const allSuffixes = [...floatSuffixes, ...inum, ...unum];

            let matchedSuffix = false;
            for (let suf of allSuffixes) {
                if (this.input.startsWith(suf, this.pos) &&
                    !this.isAlnum(this.peek(suf.length)) &&
                    !this.isAlnum(this.peek(-1))) {
                    this.addToken('TIPADO NUMÉRICO', suf, startLine, startCol);
                    for (let i = 0; i < suf.length; i++) this.advance();
                    matchedSuffix = true;
                    break;
                }
            }
            if (matchedSuffix) continue;

            // Números (enteros y decimales)
            
            if (this.isDigit(ch)) {
                const startLine = this.line, startCol = this.col;
                let lex = this.advance();

                // Parte entera
                
                while (this.isDigit(this.peek())) lex += this.advance();

                // Parte decimal
                
                if (this.peek() === '.' && this.isDigit(this.peek(1))) {
                    lex += this.advance();
                    while (this.isDigit(this.peek())) lex += this.advance();

                    // Sufijo flotante (f32, f64)
                    
                    let hasSuffix = false;
                    for (let suf of floatSuffixes) {
                        if (this.input.startsWith(suf, this.pos)) {
                            lex += suf;
                            for (let i = 0; i < suf.length; i++) this.advance();
                            hasSuffix = true;
                            break;
                        }
                    }
                    this.addToken(hasSuffix ? 'DECIMAL TIPADO' : 'DECIMAL', lex, startLine, startCol);
                    continue;
                }

                // Parte entera con posible sufijo
                
                let matched = false;
                for (let suf of [...inum, ...unum]) {
                    if (this.input.startsWith(suf, this.pos)) {
                        lex += suf;
                        for (let i = 0; i < suf.length; i++) this.advance();
                        this.addToken('ENTERO TIPADO', lex, startLine, startCol);
                        matched = true;
                        break;
                    }
                }
                if (!matched) this.addToken('ENTERO', lex, startLine, startCol);
                continue;
            }

            // Separadores

            if (ch === ';') { this.addToken('FIN DE SENTENCIA', this.advance(), startLine, startCol); continue; }
            if (ch === ',') { this.addToken('SEPARADOR LÓGICO', this.advance(), startLine, startCol); continue; }
            if (ch === ':' && this.peek(1) === ':') {
                this.addToken('SEPARADOR DE MÓDULO', '::', startLine, startCol);
                this.advance(); this.advance(); continue;
            }
            if (ch === '.') { this.addToken('OPERADOR PUNTO', this.advance(), startLine, startCol); continue; }

            // Identificadores / keywords / macros

            if (this.isLetter(ch)) {
                let lex = this.advance();
                while (this.isAlnum(this.peek())) lex += this.advance();

                // Si el identificador es demasiado largo, se registra el error y no se agrega el token

                if (lex.length > 15) {
                    this.errors.add("Identificador muy largo", startLine, startCol);
                    continue;
                }

                // Si termina en '!' es macro o palabra reservada con macro

                if (this.peek() === '!') {
                    lex += this.advance();
                    this.addToken('PALABRA RESERVADA', lex, startLine, startCol);
                    continue;
                }

                // Determinar si es palabra reservada o identificador normal
                const tipo = this.keywords.has(lex) ? 'PALABRA RESERVADA' : 'IDENTIFICADOR';
                this.addToken(tipo, lex, startLine, startCol);
                continue;
            }

            // Operadores y símbolos varios

            const two = ch + (this.peek(1) || '');
            if (['==', '!=', '<=', '>='].includes(two)) {
                this.addToken('OPERADOR DE COMPARACIÓN', two, startLine, startCol);
                this.advance(); this.advance(); continue;
            }
            if (['<', '>'].includes(ch)) {
                this.addToken('OPERADOR DE COMPARACIÓN', this.advance(), startLine, startCol);
                continue;
            }
            if (['&&', '||'].includes(two)) {
                this.addToken('OPERADOR LÓGICO', two, startLine, startCol);
                this.advance(); this.advance(); continue;
            }
            if (['++', '--'].includes(two)) {
                this.addToken('OPERADOR DE INCREMENTO/DECREMENTO', two, startLine, startCol);
                this.advance(); this.advance(); continue;
            }
            if ('+-*/%'.includes(ch)) {
                this.addToken('OPERADOR ARITMÉTICO', this.advance(), startLine, startCol);
                continue;
            }
            if (':='.includes(ch)) {
                this.addToken('OPERADOR DE ASIGNACIÓN', this.advance(), startLine, startCol);
                continue;
            }
            if ('&|^!'.includes(ch)) {
                this.addToken('OPERADOR BIT', this.advance(), startLine, startCol);
                continue;
            }

            if (ch === '(') { this.addToken('APERTURA DE PARENTESIS', this.advance(), startLine, startCol); continue; }
            if (ch === ')') { this.addToken('CIERRE DE PARENTESIS', this.advance(), startLine, startCol); continue; }
            if (ch === '{') { this.addToken('APERTURA DE LLAVE', this.advance(), startLine, startCol); continue; }
            if (ch === '}') { this.addToken('CIERRE DE LLAVE', this.advance(), startLine, startCol); continue; }
            if (ch === '[') { this.addToken('APERTURA DE CORCHETE', this.advance(), startLine, startCol); continue; }
            if (ch === ']') { this.addToken('CIERRE DE CORCHETE', this.advance(), startLine, startCol); continue; }

            if (ch === '-' && this.peek(1) === '>') {
                this.addToken('OPERADOR FLECHA', '->', startLine, startCol);
                this.advance(); this.advance(); continue;
            }

            if (ch === '"') {
                this.advance();
                let lex = '"';
                let closed = false;
                while (this.peek() !== null) {
                    const c = this.advance();
                    lex += c;
                    if (c === '\\') { lex += this.advance(); continue; }
                    if (c === '"') { closed = true; break; }
                    if (c === '\n') { this.errors.add("Cadena sin cerrar", startLine, startCol); break; }
                }
                if (!closed) this.errors.add("Cadena sin cerrar", startLine, startCol);
                else this.addToken('CADENA', lex, startLine, startCol);
                continue;
            }

            this.errors.add(`Token no reconocido '${ch}'`, startLine, startCol);
            this.advance();
        }
        return { tokens: this.tokens, errors: this.errors.errors };
    }
}

export default Lexer;
