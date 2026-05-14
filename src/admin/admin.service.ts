import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getMetrics(from?: string, to?: string) {
        const dateFilter: any = {};
        if (from || to) {
            dateFilter.createdAt = {};
            if (from) dateFilter.createdAt.gte = new Date(from);
            if (to) dateFilter.createdAt.lte = new Date(to);
        }

        const [doctors, patients, prescriptions, pending, consumed, byDay, topDoctors] =
            await this.prisma.$transaction([
                this.prisma.doctor.count(),
                this.prisma.patient.count(),
                this.prisma.prescription.count({ where: dateFilter }),
                this.prisma.prescription.count({ where: { ...dateFilter, status: 'pending' } }),
                this.prisma.prescription.count({ where: { ...dateFilter, status: 'consumed' } }),
                this.prisma.prescription.groupBy({
                    by: ['createdAt'],
                    where: dateFilter,
                    _count: { id: true },
                    orderBy: { createdAt: 'asc' },
                }),
                this.prisma.prescription.groupBy({
                    by: ['authorId'],
                    where: dateFilter,
                    _count: { id: true },
                    orderBy: { _count: { id: 'desc' } },
                    take: 5,
                }),
            ]);

        const byDayFormatted = byDay.map((d) => ({
            date: d.createdAt.toISOString().split('T')[0],
            count: (d._count as any).id ?? 0,
        }));

        const topDoctorsFormatted = topDoctors.map((d) => ({
            doctorId: d.authorId,
            count: (d._count as any).id ?? 0,
        }));

        return {
            totals: { doctors, patients, prescriptions },
            byStatus: { pending, consumed },
            byDay: byDayFormatted,
            topDoctors: topDoctorsFormatted,
        };
    }

    async getPrescriptions(filters: {
        status?: string;
        doctorId?: string;
        patientId?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    }) {
        const where: any = {};
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        if (filters.status) where.status = filters.status;
        if (filters.doctorId) where.authorId = filters.doctorId;
        if (filters.patientId) where.patientId = filters.patientId;
        if (filters.from || filters.to) {
            where.createdAt = {};
            if (filters.from) where.createdAt.gte = new Date(filters.from);
            if (filters.to) where.createdAt.lte = new Date(filters.to);
        }

        const [data, total] = await this.prisma.$transaction([
            this.prisma.prescription.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: true,
                    patient: { include: { user: { select: { name: true, email: true } } } },
                    author: { include: { user: { select: { name: true, email: true } } } },
                },
            }),
            this.prisma.prescription.count({ where }),
        ]);

        return { data, total, page, limit };
    }
}