import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { FilterPrescriptionDto } from './dto/filter-prescription.dto';
import { User } from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(user: User, dto: CreatePrescriptionDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) throw new ForbiddenException('Solo médicos pueden crear prescripciones');

    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    return this.prisma.prescription.create({
      data: {
        patientId: dto.patientId,
        authorId: doctor.id,
        notes: dto.notes,
        items: {
          create: dto.items,
        },
      },
      include: { items: true, patient: { include: { user: true } } },
    });
  }

  async findAll(user: User, filters: FilterPrescriptionDto) {
    const where: any = {};
    const skip = ((filters.page || 1) - 1) * (filters.limit || 10);

    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    if (user.role === 'doctor') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      where.authorId = doctor?.id;
    }

    if (user.role === 'patient') {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      where.patientId = patient?.id;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prescription.findMany({
        where,
        skip,
        take: filters.limit || 10,
        orderBy: { createdAt: filters.order || 'desc' },
        include: {
          items: true,
          patient: { include: { user: { select: { name: true, email: true } } } },
          author: { include: { user: { select: { name: true, email: true } } } },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return { data, total, page: filters.page || 1, limit: filters.limit || 10 };
  }

  async findOne(id: string, user: User) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        patient: { include: { user: { select: { name: true, email: true } } } },
        author: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    if (!prescription) throw new NotFoundException('Prescripción no encontrada');

    if (user.role === 'doctor') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.id } });
      if (prescription.authorId !== doctor?.id) throw new ForbiddenException();
    }

    if (user.role === 'patient') {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (prescription.patientId !== patient?.id) throw new ForbiddenException();
    }

    return prescription;
  }

  async consume(id: string, user: User) {
    const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) throw new ForbiddenException();

    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescripción no encontrada');
    if (prescription.patientId !== patient.id) throw new ForbiddenException();

    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'consumed', consumedAt: new Date() },
    });
  }
}