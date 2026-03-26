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
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { SearchWorkshopDto } from './dto/search-workshop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('workshops')
@UseGuards(JwtAuthGuard)
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  create(@Body() createWorkshopDto: CreateWorkshopDto) {
    return this.workshopsService.create(createWorkshopDto);
  }

  @Get()
  findAll(@Query() searchDto: SearchWorkshopDto) {
    const hasSearchParams = Object.keys(searchDto).some(
      (key) => searchDto[key] !== undefined && searchDto[key] !== '',
    );

    if (hasSearchParams) {
      return this.workshopsService.search(searchDto);
    }

    return this.workshopsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkshopDto: UpdateWorkshopDto) {
    return this.workshopsService.update(id, updateWorkshopDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workshopsService.remove(id);
  }
}

