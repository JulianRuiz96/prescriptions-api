import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    doctor: { create: jest.fn() },
    patient: { create: jest.fn() },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe retornar tokens si las credenciales son válidas', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashed,
        role: 'doctor',
      });

      const result = await service.login({ email: 'test@test.com', password: 'password123' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'no@existe.com', password: '123456' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      const hashed = await bcrypt.hash('correcta', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'test@test.com', password: hashed, role: 'doctor',
      });
      await expect(service.login({ email: 'test@test.com', password: 'incorrecta' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('debe lanzar ConflictException si el email ya existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'ya@existe.com' });
      await expect(service.register({ email: 'ya@existe.com', password: '123456', name: 'Test', role: 'doctor' as any }))
        .rejects.toThrow(ConflictException);
    });
  });
});