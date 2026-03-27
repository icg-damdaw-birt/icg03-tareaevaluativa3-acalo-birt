/**
 * TESTS DE FAVORITOS (PATCH /api/movies/:id/favorite)
 * 
 * Prueba el toggle de favoritos: marcar, desmarcar,
 * película inexistente, película de otro usuario, y error interno.
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS
// ============================================

const mockPrisma = {
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
// SUITE DE TESTS: FAVORITOS
// ============================================
describe('Favoritos - PATCH /api/movies/:id/favorite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería marcar una película como favorita (false → true)', async () => {
    // ARRANGE
    const peliculaMock = {
      id: 'movie-1',
      title: 'Inception',
      director: 'Christopher Nolan',
      year: 2010,
      posterUrl: 'https://example.com/inception.jpg',
      isFavorite: false,
      ownerId: 'user-123',
    };
    const peliculaActualizada = { ...peliculaMock, isFavorite: true };

    prisma.movie.findFirst.mockResolvedValue(peliculaMock);
    prisma.movie.update.mockResolvedValue(peliculaActualizada);

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/favorite')
      .set('Authorization', 'Bearer fake-token');

    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body.isFavorite).toBe(true);
    expect(prisma.movie.findFirst).toHaveBeenCalledWith({
      where: { id: 'movie-1', ownerId: 'user-123' },
    });
    expect(prisma.movie.update).toHaveBeenCalledWith({
      where: { id: 'movie-1' },
      data: { isFavorite: true },
    });
  });

  it('debería desmarcar una película favorita (true → false)', async () => {
    // ARRANGE
    const peliculaMock = {
      id: 'movie-1',
      title: 'Inception',
      director: 'Christopher Nolan',
      year: 2010,
      posterUrl: 'https://example.com/inception.jpg',
      isFavorite: true,
      ownerId: 'user-123',
    };
    const peliculaActualizada = { ...peliculaMock, isFavorite: false };

    prisma.movie.findFirst.mockResolvedValue(peliculaMock);
    prisma.movie.update.mockResolvedValue(peliculaActualizada);

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/favorite')
      .set('Authorization', 'Bearer fake-token');

    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body.isFavorite).toBe(false);
    expect(prisma.movie.update).toHaveBeenCalledWith({
      where: { id: 'movie-1' },
      data: { isFavorite: false },
    });
  });

  it('debería devolver 404 si la película no existe', async () => {
    // ARRANGE
    prisma.movie.findFirst.mockResolvedValue(null);

    // ACT
    const response = await request(app)
      .patch('/api/movies/no-existe/favorite')
      .set('Authorization', 'Bearer fake-token');

    // ASSERT
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Película no encontrada');
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });

  it('debería devolver 404 si la película pertenece a otro usuario', async () => {
    // ARRANGE
    prisma.movie.findFirst.mockResolvedValue(null);

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-otro-user/favorite')
      .set('Authorization', 'Bearer fake-token');

    // ASSERT
    expect(response.status).toBe(404);
    expect(prisma.movie.update).not.toHaveBeenCalled();
  });

  it('debería devolver 500 si ocurre un error en la base de datos', async () => {
    // ARRANGE
    prisma.movie.findFirst.mockRejectedValue(new Error('DB connection lost'));

    // ACT
    const response = await request(app)
      .patch('/api/movies/movie-1/favorite')
      .set('Authorization', 'Bearer fake-token');

    // ASSERT
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Error al actualizar favorito');
  });
});
