import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding...');

    // Limpiar datos previos
    await prisma.prescriptionItem.deleteMany();
    await prisma.prescription.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const drPassword = await bcrypt.hash('dr123456', 10);
    const patientPassword = await bcrypt.hash('patient123', 10);

    // Admin
    await prisma.user.create({
        data: {
            email: 'admin@test.com',
            password: hashedPassword,
            name: 'Admin User',
            role: 'admin',
        },
    });

    // Doctor
    const doctorUser = await prisma.user.create({
        data: {
            email: 'dr@test.com',
            password: drPassword,
            name: 'Dr. Juan Pérez',
            role: 'doctor',
            doctor: {
                create: { specialty: 'Medicina General' },
            },
        },
        include: { doctor: true },
    });

    // Paciente
    const patientUser = await prisma.user.create({
        data: {
            email: 'patient@test.com',
            password: patientPassword,
            name: 'Carlos García',
            role: 'patient',
            patient: {
                create: { birthDate: new Date('1990-05-15') },
            },
        },
        include: { patient: true },
    });

    const doctor = doctorUser.doctor!;
    const patient = patientUser.patient!;

    // Prescripciones de ejemplo
    const prescriptions = [
        {
            status: 'pending' as const,
            notes: 'Tomar con abundante agua',
            items: [
                { name: 'Amoxicilina 500mg', dosage: '1 c/8h', quantity: 21, instructions: 'Después de comer' },
                { name: 'Ibuprofeno 400mg', dosage: '1 c/8h', quantity: 15, instructions: 'Con comida' },
            ],
        },
        {
            status: 'consumed' as const,
            notes: 'Control en 15 días',
            items: [
                { name: 'Metformina 850mg', dosage: '1 c/12h', quantity: 60, instructions: 'Con el desayuno' },
            ],
        },
        {
            status: 'pending' as const,
            notes: 'Reposo relativo',
            items: [
                { name: 'Loratadina 10mg', dosage: '1 vez al día', quantity: 10, instructions: 'En la noche' },
                { name: 'Fluticasona spray nasal', dosage: '2 puff c/12h', quantity: 1, instructions: 'Agitar antes de usar' },
            ],
        },
        {
            status: 'consumed' as const,
            notes: 'Completar tratamiento',
            items: [
                { name: 'Azitromicina 500mg', dosage: '1 vez al día', quantity: 3, instructions: 'Antes de dormir' },
            ],
        },
        {
            status: 'pending' as const,
            notes: 'Seguimiento en 1 mes',
            items: [
                { name: 'Atorvastatina 20mg', dosage: '1 vez al día', quantity: 30, instructions: 'En la noche' },
                { name: 'Enalapril 10mg', dosage: '1 c/12h', quantity: 60, instructions: 'Con o sin comida' },
            ],
        },
    ];

    for (const p of prescriptions) {
        await prisma.prescription.create({
            data: {
                patientId: patient.id,
                authorId: doctor.id,
                status: p.status,
                notes: p.notes,
                consumedAt: p.status === 'consumed' ? new Date() : null,
                items: { create: p.items },
            },
        });
    }

    console.log('admin@test.com / admin123');
    console.log('dr@test.com / dr123456');
    console.log('patient@test.com / patient123');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());