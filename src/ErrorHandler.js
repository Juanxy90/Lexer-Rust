// Clase que maneja los errores del lexer

class ErrorHandler {
    constructor() {
        this.errors = [];
    }

    add(msg, line, col) {
        this.errors.push({ msg, line, col });
    }

    hasErrors() {
        return this.errors.length > 0;
    }

    clear() {
        this.errors = [];
    }
}

export default ErrorHandler;