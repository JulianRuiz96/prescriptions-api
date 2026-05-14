import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';
import * as htmlPdf from 'html-pdf-node';

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  async generatePrescriptionPdf(id: string, user: User): Promise<Buffer> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        patient: { include: { user: { select: { name: true, email: true } } } },
        author: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    if (!prescription) throw new NotFoundException('Prescripción no encontrada');

    if (user.role === 'patient') {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.id } });
      if (prescription.patientId !== patient?.id) throw new ForbiddenException();
    }

    const html = this.buildHtml(prescription);
    const file = { content: html };
    const options = { format: 'A4' };
    const buffer = await htmlPdf.generatePdf(file, options);
    return buffer;
  }

  private buildHtml(prescription: any): string {
    const items = prescription.items
      .map(
        (item: any) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.dosage || '-'}</td>
          <td>${item.quantity || '-'}</td>
          <td>${item.instructions || '-'}</td>
        </tr>`,
      )
      .join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .info-box h3 { margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase; }
        .info-box p { margin: 4px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #2563eb; color: white; padding: 10px; text-align: left; font-size: 13px; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        tr:nth-child(even) { background: #f8fafc; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .pending { background: #fef3c7; color: #d97706; }
        .consumed { background: #d1fae5; color: #065f46; }
        .notes { background: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .code { font-family: monospace; font-size: 12px; color: #64748b; }
        footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <h1>Prescripción Médica</h1>
      <p class="code">Código: ${prescription.code}</p>
      <p>Estado: <span class="status ${prescription.status}">${prescription.status === 'pending' ? 'Pendiente' : 'Consumida'}</span></p>

      <div class="info-grid">
        <div class="info-box">
          <h3>Paciente</h3>
          <p><strong>${prescription.patient.user.name}</strong></p>
          <p>${prescription.patient.user.email}</p>
        </div>
        <div class="info-box">
          <h3>Médico</h3>
          <p><strong>${prescription.author.user.name}</strong></p>
          <p>${prescription.author.user.email}</p>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Fecha de creación</h3>
          <p>${new Date(prescription.createdAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
        </div>
        ${prescription.consumedAt ? `
        <div class="info-box">
          <h3>Fecha de consumo</h3>
          <p>${new Date(prescription.consumedAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
        </div>` : ''}
      </div>

      ${prescription.notes ? `<div class="notes"><strong>Notas:</strong> ${prescription.notes}</div>` : ''}

      <table>
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Dosis</th>
            <th>Cantidad</th>
            <th>Indicaciones</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>

      <footer>Documento generado el ${new Date().toLocaleString('es-CO')} — MedScript</footer>
    </body>
    </html>`;
  }
}