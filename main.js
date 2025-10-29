import Lexer from './src/Lexer.js';

const textarea = document.getElementById('codeInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const tokensTableBody = document.querySelector('#tokensTable tbody');
const errorsList = document.getElementById('errorsList');

analyzeBtn.addEventListener('click', () => {
    const code = textarea.value;
    const lexer = new Lexer(code);
    const { tokens, errors } = lexer.lex();

    // Limpiar tabla y errores

    tokensTableBody.innerHTML = '';
    errorsList.innerHTML = '';

    // Mostrar tokens

    tokens.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${t.lexeme}</td><td>${t.type}</td><td>${t.line}</td><td>${t.col}</td>`;
        tokensTableBody.appendChild(row);
    });

    // Mostrar errores

    errors.forEach(e => {
        const li = document.createElement('li');
        li.textContent = `${e.msg} (Fila: ${e.line}, Columna: ${e.col})`;
        errorsList.appendChild(li);
    });
});