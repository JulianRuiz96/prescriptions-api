import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { PdfService } from './pdf.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { FilterPrescriptionDto } from './dto/filter-prescription.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { User } from '@prisma/client';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private prescriptionsService: PrescriptionsService,
    private pdfService: PdfService,
  ) {}

  @Roles('doctor')
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptionsService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query() filters: FilterPrescriptionDto) {
    return this.prescriptionsService.findAll(user, filters);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.prescriptionsService.findOne(id, user);
  }

  @Roles('patient')
  @Put(':id/consume')
  consume(@CurrentUser() user: User, @Param('id') id: string) {
    return this.prescriptionsService.consume(id, user);
  }

  @Roles('patient')
  @Get(':id/pdf')
  async getPdf(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generatePrescriptionPdf(id, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="prescripcion-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}