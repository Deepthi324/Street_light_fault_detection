const jwt = require('jsonwebtoken');
const JWT_SECRET = "street-light-dbms-secret-change-in-prod";

const user = {
    id: 6,
    email: 'pal123456@gmail.com',
    role: 'citizen'
};

const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
console.log(token);
