import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './vehicles.dto';

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private vehicles: VehiclesService) {}

  /** Moje auta — garaż jest prywatny, cudzych nie wystawiamy */
  @Get()
  list(@Req() req: any) {
    return this.vehicles.list(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(req.user.id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.vehicles.remove(req.user.id, id);
  }
}
