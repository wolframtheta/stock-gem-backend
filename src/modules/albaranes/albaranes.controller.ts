import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlbaranesService } from './albaranes.service';
import { CreateAlbaranDto } from './dto/create-albaran.dto';
import { UpdateAlbaranDto } from './dto/update-albaran.dto';
import { SearchAlbaranDto } from './dto/search-albaran.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('albaranes')
@UseGuards(JwtAuthGuard)
export class AlbaranesController {
  constructor(private readonly albaranesService: AlbaranesService) {}

  @Post()
  create(@Body() createAlbaranDto: CreateAlbaranDto) {
    return this.albaranesService.create(createAlbaranDto);
  }

  @Get()
  findAll(@Query() searchDto: SearchAlbaranDto) {
    // Si hi ha paràmetres de cerca, usar search, sinó llistar tots
    const hasSearchParams = Object.keys(searchDto).some(
      (key) => searchDto[key] !== undefined && searchDto[key] !== '',
    );

    if (hasSearchParams) {
      return this.albaranesService.search(searchDto);
    }

    return this.albaranesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.albaranesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAlbaranDto: UpdateAlbaranDto,
  ) {
    return this.albaranesService.update(id, updateAlbaranDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.albaranesService.remove(id);
  }
}

