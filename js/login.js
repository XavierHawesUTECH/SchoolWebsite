//Garren Burke - [2510158] & Xavier Hawes - [2504358] @ Thursday 1-3pm


"use strict";

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;

    const account = ACCOUNTS.find(acc => acc.username === username && acc.password === password);

    if (account) {
        saveSession(account);
        window.location.href = 'dashboard.html';
    } else {
        showMessage('loginResult', 'Invalid username or password.', 'error');
    }
});
