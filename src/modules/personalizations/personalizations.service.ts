import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Personalization } from './entities/personalization.entity';
import { CreatePersonalizationDto } from './dto/create-personalization.dto';
import { UpdatePersonalizationDto } from './dto/update-personalization.dto';
import { SearchPersonalizationDto } from './dto/search-personalization.dto';
import { Client } from '../clients/entities/client.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { PersonalizationType } from '../config/entities/personalization-type.entity';

@Injectable()
export class PersonalizationsService {
  constructor(
    @InjectRepository(Personalization)
    private personalizationRepository: Repository<Personalization>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Workshop)
    private workshopRepository: Repository<Workshop>,
    @InjectRepository(PersonalizationType)
    private personalizationTypeRepository: Repository<PersonalizationType>,
  ) {}

  async create(
    createPersonalizationDto: CreatePersonalizationDto,
  ): Promise<Personalization> {
    const existing = await this.personalizationRepository.findOne({
      where: { code: createPersonalizationDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Ja existe una personalització amb el codi ${createPersonalizationDto.code}`,
      );
    }

    const client = await this.clientRepository.findOne({
      where: { id: createPersonalizationDto.clientId },
    });

    if (!client) {
      throw new NotFoundException(
        `Client amb ID ${createPersonalizationDto.clientId} no trobat`,
      );
    }

    let workshop: Workshop | null = null;
    if (createPersonalizationDto.workshopId) {
      workshop = await this.workshopRepository.findOne({
        where: { id: createPersonalizationDto.workshopId },
      });

      if (!workshop) {
        throw new NotFoundException(
          `Taller amb ID ${createPersonalizationDto.workshopId} no trobat`,
        );
      }
    }

    let personalizationType: PersonalizationType | null = null;
    if (createPersonalizationDto.personalizationTypeId) {
      personalizationType = await this.personalizationTypeRepository.findOne({
        where: { id: createPersonalizationDto.personalizationTypeId },
      });
      if (!personalizationType) {
        throw new NotFoundException('Tipus de personalització no trobat');
      }
    }

    const pvp = createPersonalizationDto.pvp || 0;
    const paymentOnAccount = createPersonalizationDto.paymentOnAccount || 0;

    if (paymentOnAccount > pvp) {
      throw new BadRequestException(
        'El pagament a compte no pot ser major que el PVP',
      );
    }

    const personalization = this.personalizationRepository.create({
      code: createPersonalizationDto.code,
      client,
      workshop,
      personalizationType,
      description: createPersonalizationDto.description,
      workToDo: createPersonalizationDto.workToDo || null,
      entryDate: new Date(createPersonalizationDto.entryDate),
      deliveryToWorkshopDate: createPersonalizationDto.deliveryToWorkshopDate
        ? new Date(createPersonalizationDto.deliveryToWorkshopDate)
        : null,
      exitFromWorkshopDate: createPersonalizationDto.exitFromWorkshopDate
        ? new Date(createPersonalizationDto.exitFromWorkshopDate)
        : null,
      deliveryToClientDate: createPersonalizationDto.deliveryToClientDate
        ? new Date(createPersonalizationDto.deliveryToClientDate)
        : null,
      cost: createPersonalizationDto.cost || 0,
      pvp,
      paymentOnAccount,
      photo: createPersonalizationDto.photo || null,
    });

    const saved = await this.personalizationRepository.save(personalization);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<Personalization[]> {
    return this.personalizationRepository.find({
      relations: ['client', 'workshop', 'personalizationType'],
      order: { entryDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Personalization> {
    const personalization = await this.personalizationRepository.findOne({
      where: { id },
      relations: ['client', 'workshop', 'personalizationType'],
    });

    if (!personalization) {
      throw new NotFoundException(`Personalització amb ID ${id} no trobada`);
    }

    return personalization;
  }

  async update(
    id: string,
    updatePersonalizationDto: UpdatePersonalizationDto,
  ): Promise<Personalization> {
    const personalization = await this.findOne(id);

    if (
      updatePersonalizationDto.code &&
      updatePersonalizationDto.code !== personalization.code
    ) {
      const existing = await this.personalizationRepository.findOne({
        where: { code: updatePersonalizationDto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Ja existe una personalització amb el codi ${updatePersonalizationDto.code}`,
        );
      }
    }

    if (updatePersonalizationDto.clientId !== undefined) {
      const client = await this.clientRepository.findOne({
        where: { id: updatePersonalizationDto.clientId },
      });

      if (!client) {
        throw new NotFoundException(
          `Client amb ID ${updatePersonalizationDto.clientId} no trobat`,
        );
      }

      personalization.client = client;
    }

    if (updatePersonalizationDto.workshopId !== undefined) {
      if (updatePersonalizationDto.workshopId === null) {
        personalization.workshop = null;
      } else {
        const workshop = await this.workshopRepository.findOne({
          where: { id: updatePersonalizationDto.workshopId },
        });

        if (!workshop) {
          throw new NotFoundException(
            `Taller amb ID ${updatePersonalizationDto.workshopId} no trobat`,
          );
        }

        personalization.workshop = workshop;
      }
    }

    if (updatePersonalizationDto.personalizationTypeId !== undefined) {
      if (updatePersonalizationDto.personalizationTypeId === null) {
        personalization.personalizationType = null;
        personalization.personalizationTypeId = null;
      } else {
        const pt = await this.personalizationTypeRepository.findOne({
          where: { id: updatePersonalizationDto.personalizationTypeId },
        });
        if (!pt) {
          throw new NotFoundException('Tipus de personalització no trobat');
        }
        personalization.personalizationType = pt;
        personalization.personalizationTypeId = pt.id;
      }
    }

    const pvp = updatePersonalizationDto.pvp ?? personalization.pvp;
    const paymentOnAccount =
      updatePersonalizationDto.paymentOnAccount ??
      personalization.paymentOnAccount;

    if (paymentOnAccount > pvp) {
      throw new BadRequestException(
        'El pagament a compte no pot ser major que el PVP',
      );
    }

    Object.assign(personalization, {
      code: updatePersonalizationDto.code ?? personalization.code,
      description:
        updatePersonalizationDto.description ?? personalization.description,
      workToDo: updatePersonalizationDto.workToDo ?? personalization.workToDo,
      entryDate: updatePersonalizationDto.entryDate
        ? new Date(updatePersonalizationDto.entryDate)
        : personalization.entryDate,
      deliveryToWorkshopDate: updatePersonalizationDto.deliveryToWorkshopDate
        ? new Date(updatePersonalizationDto.deliveryToWorkshopDate)
        : updatePersonalizationDto.deliveryToWorkshopDate === null
          ? null
          : personalization.deliveryToWorkshopDate,
      exitFromWorkshopDate: updatePersonalizationDto.exitFromWorkshopDate
        ? new Date(updatePersonalizationDto.exitFromWorkshopDate)
        : updatePersonalizationDto.exitFromWorkshopDate === null
          ? null
          : personalization.exitFromWorkshopDate,
      deliveryToClientDate: updatePersonalizationDto.deliveryToClientDate
        ? new Date(updatePersonalizationDto.deliveryToClientDate)
        : updatePersonalizationDto.deliveryToClientDate === null
          ? null
          : personalization.deliveryToClientDate,
      cost: updatePersonalizationDto.cost ?? personalization.cost,
      pvp,
      paymentOnAccount,
      photo: updatePersonalizationDto.photo ?? personalization.photo,
    });

    return this.personalizationRepository.save(personalization);
  }

  async remove(id: string): Promise<void> {
    const personalization = await this.findOne(id);
    await this.personalizationRepository.remove(personalization);
  }

  async search(
    searchDto: SearchPersonalizationDto,
  ): Promise<Personalization[]> {
    const queryBuilder = this.personalizationRepository
      .createQueryBuilder('personalization')
      .leftJoinAndSelect('personalization.client', 'client')
      .leftJoinAndSelect('personalization.workshop', 'workshop')
      .leftJoinAndSelect(
        'personalization.personalizationType',
        'personalizationType',
      );

    if (searchDto.code) {
      queryBuilder.andWhere('personalization.code LIKE :code', {
        code: `%${searchDto.code}%`,
      });
    }

    if (searchDto.clientId) {
      queryBuilder.andWhere('personalization.client.id = :clientId', {
        clientId: searchDto.clientId,
      });
    }

    if (searchDto.workshopId) {
      queryBuilder.andWhere('personalization.workshop.id = :workshopId', {
        workshopId: searchDto.workshopId,
      });
    }

    if (searchDto.clientName) {
      queryBuilder.andWhere(
        '(client.name ILIKE :clientName OR client.surname ILIKE :clientName)',
        { clientName: `%${searchDto.clientName}%` },
      );
    }

    if (searchDto.workshopName) {
      queryBuilder.andWhere('workshop.name ILIKE :workshopName', {
        workshopName: `%${searchDto.workshopName}%`,
      });
    }

    if (searchDto.entryDateFrom && searchDto.entryDateTo) {
      queryBuilder.andWhere(
        'personalization.entryDate BETWEEN :entryDateFrom AND :entryDateTo',
        {
          entryDateFrom: searchDto.entryDateFrom,
          entryDateTo: searchDto.entryDateTo,
        },
      );
    } else if (searchDto.entryDateFrom) {
      queryBuilder.andWhere('personalization.entryDate >= :entryDateFrom', {
        entryDateFrom: searchDto.entryDateFrom,
      });
    } else if (searchDto.entryDateTo) {
      queryBuilder.andWhere('personalization.entryDate <= :entryDateTo', {
        entryDateTo: searchDto.entryDateTo,
      });
    }

    if (
      searchDto.deliveryToClientDateFrom &&
      searchDto.deliveryToClientDateTo
    ) {
      queryBuilder.andWhere(
        'personalization.deliveryToClientDate BETWEEN :deliveryToClientDateFrom AND :deliveryToClientDateTo',
        {
          deliveryToClientDateFrom: searchDto.deliveryToClientDateFrom,
          deliveryToClientDateTo: searchDto.deliveryToClientDateTo,
        },
      );
    } else if (searchDto.deliveryToClientDateFrom) {
      queryBuilder.andWhere(
        'personalization.deliveryToClientDate >= :deliveryToClientDateFrom',
        {
          deliveryToClientDateFrom: searchDto.deliveryToClientDateFrom,
        },
      );
    } else if (searchDto.deliveryToClientDateTo) {
      queryBuilder.andWhere(
        'personalization.deliveryToClientDate <= :deliveryToClientDateTo',
        {
          deliveryToClientDateTo: searchDto.deliveryToClientDateTo,
        },
      );
    }

    queryBuilder
      .orderBy('personalization.entryDate', 'DESC')
      .addOrderBy('personalization.createdAt', 'DESC');

    return queryBuilder.getMany();
  }
}
