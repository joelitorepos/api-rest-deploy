const express = require('express');
const z = require('zod');
const movies = require('./movies/movies.json');
const cors = require('cors');

const app = express();
app.use(express.json());

// app.use(cors()); esto sirve para solucionar el problema de CORS en todos los origenes
// app.use(cors());
const movieSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    year: z.number().int().min(1888).max(new Date().getFullYear()),
    director: z.string().min(1, 'Director is required'),
    duration: z.number().int().positive('Duration must be positive'),
    poster: z.string().url('Poster must be a valid URL'),
    genre: z.string().min(1, 'At least one genre is required'),
    rate: z.number().min(0).max(10).default(0)
});

// para los cors con origenes en concreto
app.use(cors({
    origin: (origin, callback) => { //manejador dinamico de origenes
        const ACEPTED_ORIGINS = [
            'http://localhost:3000',
            'http://localhost:8080',
            'http://movies.com',
            'https://midu.dev',
        ]

        if (ACEPTED_ORIGINS.includes(origin)) {
            return callback(null, true)
        }
        if(!origin) {
            return callback(null, true)
        }

        return callback(new Error('CORS no permitido'))
    }
}));

app.use(express.static('web'));

// Funciones de validación
const validar = (input) => movieSchema.safeParse(input);
const validarParcialmente = (input) => movieSchema.partial().safeParse(input);

app.get('/', (req, res) => {
    res.send('Bienvenido a la API de Películas. Usa /movies para obtener la lista de películas.');
});

// Rutas
app.get('/movies', (req, res) => {
    const { genre } = req.query;
    if (genre) {
        const filteredMovies = movies.filter(movie => 
            movie.genre.map(g => g.toLowerCase()).includes(genre.toLowerCase())
        );
        if (filteredMovies.length === 0) {
            return res.status(404).json({ error: 'No se encontraron películas para ese género' });
        }
        return res.json(filteredMovies);
    }
    res.json(movies);
});

app.get('/movies/:id', (req, res) => {
    const { id } = req.params;
    const movieId = parseInt(id);
    const movie = movies.find(movie => movie.id === movieId);
    if (movie) {
        res.json(movie);
    } else {
        res.status(404).json({ error: 'Movie not found' });
    }
});

app.post('/movies', (req, res) => {
    const result = validar(req.body);
    if (!result.success) {
        return res.status(400).json({ error: JSON.parse(result.error.message) });
    }

    const newMovie = {
        id: parseInt(movies[movies.length - 1].id) + 1, // Incrementar ID numérico
        ...result.data
    };

    movies.push(newMovie);
    res.status(201).json(newMovie);
});

app.delete('/movies/:id', (req, res) => {
    const { id } = req.params;
    const movieIndex = movies.findIndex(movie => movie.id === parseInt(id));

    if(movieIndex === -1) {
        return res.status(404).json({ error: 'Movie not found' });
    }

    movies.splice(movieIndex, 1);

    return res.json({ massage: 'Movie deleted' });
});

app.patch('/movies/:id', (req, res) => {
    const result = validarParcialmente(req.body);
    if (!result.success) {
        return res.status(400).json({ error: JSON.parse(result.error.message) });
    }

    const { id } = req.params;
    const movieId = parseInt(id);
    const movieIndex = movies.findIndex(movie => movie.id === movieId);

    if (movieIndex === -1) {
        return res.status(404).json({ error: 'Movie not found' });
    }

    const updatedMovie = {
        ...movies[movieIndex],
        ...result.data
    };

    movies[movieIndex] = updatedMovie;
    res.json(updatedMovie);
});

app.options('movies', (req, res) => {
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.send(200);
})

// Iniciar el servidor
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// http://localhost:10000/movies
