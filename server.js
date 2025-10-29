import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Servir todo el repo para respetar rutas ../
app.use(express.static(__dirname));

// Ruta raíz -> index principal (con paths absolutos en HTML funciona todo)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'pages', 'index.html'));
});

// Ruta directa a cuadrangulares
app.get('/cuadrangulares', (_req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'pages', 'cuadrangulares.html'));
});

// Redirección para URL incorrecta reportada: /src/cuadrangulares -> /src/pages/cuadrangulares
app.get('/src/cuadrangulares', (_req, res) => {
  res.redirect(302, '/src/pages/cuadrangulares');
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log('Index:', `http://localhost:${PORT}/`);
  console.log('Cuadrangulares:', `http://localhost:${PORT}/cuadrangulares`);
});


