import { BadRequestException, Controller, Get, Header, Param, Query } from '@nestjs/common';
import { PlacesService } from './places.service';

/**
 * Jedyny moduł bez `JwtAuthGuard`. Nazwy gór nie są niczyją własnością i nie
 * ma czego chronić, a strona wycieczki ma się otwierać także bez logowania —
 * podpowiedzi muszą wtedy działać.
 */
@Controller('places')
export class PlacesController {
  constructor(private places: PlacesService) {}

  /**
   * Lista popularnych miejsc zmienia się przy zmianie seeda, czyli parę razy
   * w roku. Doba w cache przeglądarki oszczędza żądanie przy każdym wejściu
   * w formularz.
   */
  @Get('popular')
  @Header('Cache-Control', 'public, max-age=86400')
  popular() {
    return this.places.popular();
  }

  @Get('search')
  search(@Query('q') q?: string, @Query('limit') limit?: string) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Szukana fraza musi mieć co najmniej dwa znaki');
    }

    const parsed = Number(limit);
    const size = Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 50) : 10;

    return this.places.search(q, size);
  }

  @Get(':id/descendants')
  descendants(@Param('id') id: string) {
    return this.places.descendants(id);
  }
}
