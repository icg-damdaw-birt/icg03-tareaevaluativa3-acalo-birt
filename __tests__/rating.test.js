/**
 * TESTS DE RATING (PATCH /api/movies/:id/rating)
 * 
 * Prueba la actualización de rating: camino feliz,
 * valores inválidos, película inexistente, película de otro usuario,
 * y error interno.
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS
// ============================================

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  movie: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};
jest.mock('../lib/prisma', () => mockPrisma);

jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

// ============================================
// SUITE DE TESTS: API DE RATING
// ============================================
describe('API de Rating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // CAMINO FELIZ: Actualizar rating correctamente
  // ==========================================
  it('debería actualizar el rating de una película a 4', async () => {
    // ARRANGE
    const peliculaMock = {
      id: 'movie-1',
      title: 'Inception',
      director: 'Christopher Nolan',
      year: 2010,
      posterUrl: 'https://example.com/inception.jpg',
      rating: 0,
      ownerId: 'user-123',
    };
    const peliculaActualizada = { ...peliculaMock, rating: 4 };

    prisma.movie.findFirst.mockResolvedValue(peliculaMock);
    prisma.movie.update.mockResolvedValue(peliculaActualizada);

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: 4 });

    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body.rating).toBe(4);
    expect(prisma.movie.findFirst).toHaveBeenCalledWith({
      where: { id: 'movie-1', ownerId: 'user-123' },
    });
    expect(prisma.movie.update).toHaveBeenCalledWith({
      where: { id: 'movie-1' },
      data: { rating: 4 },
    });
  });

  // ==========================================
  // CAMINO FELIZ: Rating 0 (resetear)
  // ==========================================
  it('debería permitir poner rating a 0', async () => {
    // ARRANGE
    const peliculaMock = {
      id: 'movie-1',
      title: 'Inception',
      rating: 3,
      ownerId: 'user-123',
    };
    const peliculaActualizada = { ...peliculaMock, rating: 0 };

    prisma.movie.findFirst.mockResolvedValue(peliculaMock);
    prisma.movie.update.mockResolvedValue(peliculaActualizada);

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: 0 });

    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body.rating).toBe(0);
  });

  // ==========================================
  // CAMINO FELIZ: Rating 5 (máximo)
  // ==========================================
  it('debería permitir poner rating a 5', async () => {
    // ARRANGE
    const peliculaMock = {
      id: 'movie-1',
      title: 'Inception',
      rating: 0,
      ownerId: 'user-123',
    };
    const peliculaActualizada = { ...peliculaMock, rating: 5 };

    prisma.movie.findFirst.mockResolvedValue(peliculaMock);
    prisma.movie.update.mockResolvedValue(peliculaActualizada);

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: 5 });

    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body.rating).toBe(5);
  });

  // ==========================================
  // ERROR: Rating mayor que 5
  // ==========================================
  it('debería devolver 400 si el rating es mayor que 5', async () => {
    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: 6 });

    // ASSERT
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El rating debe ser un número entero entre 0 y 5');
    expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });

  // ==========================================
  // ERROR: Rating negativo
  // ==========================================
  it('debería devolver 400 si el rating es negativo', async () => {
    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: -1 });

    // ASSERT
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El rating debe ser un número entero entre 0 y 5');
    expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });

  // ==========================================
  // ERROR: Rating no entero (decimal)
  // ==========================================
  it('debería devolver 400 si el rating no es un entero', async () => {
    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: 3.5 });

    // ASSERT
    expect(response.status).toBe(400);
    expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });

  // ==========================================
  // ERROR: Sin body (rating undefined)
  // ==========================================
  it('debería devolver 400 si no se envía rating en el body', async () => {
    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({});

    // ASSERT
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El rating debe ser un número entero entre 0 y 5');
    expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });

  // ==========================================
  // ERROR: Película no encontrada
  // ==========================================
  it('debería devolver 404 si la película no existe', async () => {
    // ARRANGE
    prisma.movie.findFirst.mockResolvedValue(null);

    // ACT
    const response = await request(app)
      .patch('/api/movies/no-existe/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: 4 });

    // ASSERT
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Película no encontrada');
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });

  // ==========================================
  // ERROR: Película de otro usuario
  // ==========================================
  it('debería devolver 404 si la película pertenece a otro usuario', async () => {
    // ARRANGE
    prisma.movie.findFirst.mockResolvedValue(null);

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-otro-user/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: 3 });

    // ASSERT
    expect(response.status).toBe(404);
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });

  // ==========================================
  // ERROR: Fallo interno del servidor
  // ==========================================
  it('debería devolver 500 si ocurre un error en la base de datos', async () => {
    // ARRANGE
    prisma.movie.findFirst.mockRejectedValue(new Error('DB connection lost'));

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/rating')
      .set('Authorization', 'Bearer fake-token')
      .send({ rating: 4 });

    // ASSERT
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Error al actualizar el rating');
  });
});
