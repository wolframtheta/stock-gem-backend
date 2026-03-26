import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workshop } from './entities/workshop.entity';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { SearchWorkshopDto } from './dto/search-workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private workshopRepository: Repository<Workshop>,
  ) {}

  async create(createWorkshopDto: CreateWorkshopDto): Promise<Workshop> {
    const workshop = this.workshopRepository.create(createWorkshopDto);
    return this.workshopRepository.save(workshop);
  }

  async findAll(): Promise<Workshop[]> {
    return this.workshopRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Workshop> {
    const workshop = await this.workshopRepository.findOne({ where: { id } });

    if (!workshop) {
      throw new NotFoundException(`Workshop with ID ${id} not found`);
    }

    return workshop;
  }

  async update(
    id: string,
    updateWorkshopDto: UpdateWorkshopDto,
  ): Promise<Workshop> {
    const workshop = await this.findOne(id);

    Object.assign(workshop, updateWorkshopDto);

    return this.workshopRepository.save(workshop);
  }

  async remove(id: string): Promise<void> {
    const workshop = await this.findOne(id);
    await this.workshopRepository.remove(workshop);
  }

  async search(searchDto: SearchWorkshopDto): Promise<Workshop[]> {
    const queryBuilder = this.workshopRepository.createQueryBuilder('workshop');

    if (searchDto.name) {
      queryBuilder.andWhere('workshop.name ILIKE :name', {
        name: `%${searchDto.name}%`,
      });
    }

    if (searchDto.phone) {
      queryBuilder.andWhere('workshop.phone ILIKE :phone', {
        phone: `%${searchDto.phone}%`,
      });
    }

    queryBuilder.orderBy('workshop.name', 'ASC');

    return queryBuilder.getMany();
  }
}

