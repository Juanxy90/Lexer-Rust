// Clase que representa un token

class Token {
    constructor(type, lexeme, line, col) {
        this.type = type;    // Tipo del token (KEYWORD, INT, FLOAT, IDENTIFIER, etc)
        this.lexeme = lexeme;    // Texto literal del token
        this.line = line;    // Línea donde aparece
        this.col = col;    // Columna donde aparece
    }
}

export default Token;