import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SearchClientDto } from './dto/search-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const client = this.clientRepository.create(createClientDto);
    return this.clientRepository.save(client);
  }

  async findAll(): Promise<Client[]> {
    return this.clientRepository.find({
      order: { surname: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({ where: { id } });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    Object.assign(client, updateClientDto);

    return this.clientRepository.save(client);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    await this.clientRepository.remove(client);
  }

  async search(searchDto: SearchClientDto): Promise<Client[]> {
    const queryBuilder = this.clientRepository.createQueryBuilder('client');

    if (searchDto.name) {
      queryBuilder.andWhere('client.name ILIKE :name', {
        name: `%${searchDto.name}%`,
      });
    }

    if (searchDto.surname) {
      queryBuilder.andWhere('client.surname ILIKE :surname', {
        surname: `%${searchDto.surname}%`,
      });
    }

    if (searchDto.mobilePhone) {
      queryBuilder.andWhere('client.mobilePhone ILIKE :mobilePhone', {
        mobilePhone: `%${searchDto.mobilePhone}%`,
      });
    }

    if (searchDto.landlinePhone) {
      queryBuilder.andWhere('client.landlinePhone ILIKE :landlinePhone', {
        landlinePhone: `%${searchDto.landlinePhone}%`,
      });
    }

    queryBuilder.orderBy('client.surname', 'ASC');
    queryBuilder.addOrderBy('client.name', 'ASC');

    return queryBuilder.getMany();
  }
}

