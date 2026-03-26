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
import { ComposturasService } from './composturas.service';
import { CreateComposturaDto } from './dto/create-compostura.dto';
import { UpdateComposturaDto } from './dto/update-compostura.dto';
import { SearchComposturaDto } from './dto/search-compostura.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('composturas')
@UseGuards(JwtAuthGuard)
export class ComposturasController {
  constructor(private readonly composturasService: ComposturasService) {}

  @Post()
  create(@Body() createComposturaDto: CreateComposturaDto) {
    return this.composturasService.create(createComposturaDto);
  }

  @Get()
  findAll(@Query() searchDto: SearchComposturaDto) {
    // Si hi ha paràmetres de cerca, usar search, sinó llistar tots
    const hasSearchParams = Object.keys(searchDto).some(
      (key) => searchDto[key] !== undefined && searchDto[key] !== '',
    );

    if (hasSearchParams) {
      return this.composturasService.search(searchDto);
    }

    return this.composturasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.composturasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComposturaDto: UpdateComposturaDto,
  ) {
    return this.composturasService.update(id, updateComposturaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.composturasService.remove(id);
  }
}

