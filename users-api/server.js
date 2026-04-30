const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.USERS_API_KEY || 'changeme';
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(express.json());

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
const writeUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

const requireKey = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${API_KEY}`) return res.status(401).json({ error: 'No autorizado' });
  next();
};

// Listar usuarios — público (necesario para validar login)
app.get('/users', (req, res) => {
  res.json(readUsers());
});

// Agregar usuario
app.post('/users', requireKey, (req, res) => {
  const { email, role } = req.body;
  if (!email || !['admin', 'usuario'].includes(role))
    return res.status(400).json({ error: 'Email y rol requeridos (admin | usuario)' });

  const users = readUsers();
  if (users.find(u => u.email === email))
    return res.status(409).json({ error: 'El email ya existe' });

  users.push({ email, role });
  writeUsers(users);
  res.status(201).json({ email, role });
});

// Cambiar rol
app.put('/users/:email', requireKey, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'usuario'].includes(role))
    return res.status(400).json({ error: 'Rol inválido' });

  const users = readUsers();
  const user = users.find(u => u.email === req.params.email);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  user.role = role;
  writeUsers(users);
  res.json(user);
});

// Eliminar usuario
app.delete('/users/:email', requireKey, (req, res) => {
  const users = readUsers();
  const filtered = users.filter(u => u.email !== req.params.email);
  if (filtered.length === users.length)
    return res.status(404).json({ error: 'Usuario no encontrado' });

  writeUsers(filtered);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Users API corriendo en http://localhost:${PORT}`));
