import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RideRequestsService } from './ride-requests.service';
import { CreateRideRequestDto, UpdateRideRequestDto } from './ride-requests.dto';

@Controller('ride-requests')
@UseGuards(JwtAuthGuard)
export class RideRequestsController {
  constructor(private requests: RideRequestsService) {}

  /** Kto szuka przejazdu — widoczne dla każdego zalogowanego */
  @Get()
  list() {
    return this.requests.list();
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateRideRequestDto) {
    return this.requests.create(req.user.id, dto);
  }

  /** Tylko autor — „już mam czym jechać" */
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRideRequestDto) {
    return this.requests.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.requests.remove(req.user.id, id);
  }
}
