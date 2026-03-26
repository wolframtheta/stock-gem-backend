import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Compostura } from './entities/compostura.entity';
import { CreateComposturaDto } from './dto/create-compostura.dto';
import { UpdateComposturaDto } from './dto/update-compostura.dto';
import { SearchComposturaDto } from './dto/search-compostura.dto';
import { Client } from '../clients/entities/client.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { ComposturaType } from '../config/entities/compostura-type.entity';

@Injectable()
export class ComposturasService {
  constructor(
    @InjectRepository(Compostura)
    private composturaRepository: Repository<Compostura>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Workshop)
    private workshopRepository: Repository<Workshop>,
    @InjectRepository(ComposturaType)
    private composturaTypeRepository: Repository<ComposturaType>,
  ) {}

  async create(createComposturaDto: CreateComposturaDto): Promise<Compostura> {
    // Verificar que el código no existe
    const existingCompostura = await this.composturaRepository.findOne({
      where: { code: createComposturaDto.code },
    });

    if (existingCompostura) {
      throw new ConflictException(
        `Ya existe una compostura con el código ${createComposturaDto.code}`,
      );
    }

    // Verificar cliente
    const client = await this.clientRepository.findOne({
      where: { id: createComposturaDto.clientId },
    });

    if (!client) {
      throw new NotFoundException(
        `Cliente con ID ${createComposturaDto.clientId} no encontrado`,
      );
    }

    // Verificar taller si se proporciona
    let workshop: Workshop | null = null;
    if (createComposturaDto.workshopId) {
      workshop = await this.workshopRepository.findOne({
        where: { id: createComposturaDto.workshopId },
      });

      if (!workshop) {
        throw new NotFoundException(
          `Taller con ID ${createComposturaDto.workshopId} no encontrado`,
        );
      }
    }

    let composturaType: ComposturaType | null = null;
    if (createComposturaDto.composturaTypeId) {
      composturaType = await this.composturaTypeRepository.findOne({
        where: { id: createComposturaDto.composturaTypeId },
      });
      if (!composturaType) {
        throw new NotFoundException('Tipus de compostura no trobat');
      }
    }

    // Validar paymentOnAccount <= pvp
    const pvp = createComposturaDto.pvp || 0;
    const paymentOnAccount = createComposturaDto.paymentOnAccount || 0;

    if (paymentOnAccount > pvp) {
      throw new BadRequestException(
        'El pago a cuenta no puede ser mayor que el PVP',
      );
    }

    const compostura = this.composturaRepository.create({
      code: createComposturaDto.code,
      client: client,
      workshop: workshop,
      composturaType: composturaType,
      description: createComposturaDto.description,
      workToDo: createComposturaDto.workToDo || null,
      entryDate: new Date(createComposturaDto.entryDate),
      deliveryToWorkshopDate: createComposturaDto.deliveryToWorkshopDate
        ? new Date(createComposturaDto.deliveryToWorkshopDate)
        : null,
      exitFromWorkshopDate: createComposturaDto.exitFromWorkshopDate
        ? new Date(createComposturaDto.exitFromWorkshopDate)
        : null,
      deliveryToClientDate: createComposturaDto.deliveryToClientDate
        ? new Date(createComposturaDto.deliveryToClientDate)
        : null,
      cost: createComposturaDto.cost || 0,
      pvp: pvp,
      paymentOnAccount: paymentOnAccount,
      photo: createComposturaDto.photo || null,
    });

    const saved = await this.composturaRepository.save(compostura);

    return this.findOne(saved.id);
  }

  async findAll(): Promise<Compostura[]> {
    return this.composturaRepository.find({
      relations: ['client', 'workshop', 'composturaType'],
      order: { entryDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Compostura> {
    const compostura = await this.composturaRepository.findOne({
      where: { id },
      relations: ['client', 'workshop', 'composturaType'],
    });

    if (!compostura) {
      throw new NotFoundException(`Compostura con ID ${id} no encontrada`);
    }

    return compostura;
  }

  async update(
    id: string,
    updateComposturaDto: UpdateComposturaDto,
  ): Promise<Compostura> {
    const compostura = await this.findOne(id);

    // Verificar código único si se actualiza
    if (updateComposturaDto.code && updateComposturaDto.code !== compostura.code) {
      const existingCompostura = await this.composturaRepository.findOne({
        where: { code: updateComposturaDto.code },
      });

      if (existingCompostura) {
        throw new ConflictException(
          `Ya existe una compostura con el código ${updateComposturaDto.code}`,
        );
      }
    }

    // Actualizar cliente si se proporciona
    if (updateComposturaDto.clientId !== undefined) {
      const client = await this.clientRepository.findOne({
        where: { id: updateComposturaDto.clientId },
      });

      if (!client) {
        throw new NotFoundException(
          `Cliente con ID ${updateComposturaDto.clientId} no encontrado`,
        );
      }

      compostura.client = client;
    }

    // Actualizar taller si se proporciona
    if (updateComposturaDto.workshopId !== undefined) {
      if (updateComposturaDto.workshopId === null) {
        compostura.workshop = null;
      } else {
        const workshop = await this.workshopRepository.findOne({
          where: { id: updateComposturaDto.workshopId },
        });

        if (!workshop) {
          throw new NotFoundException(
            `Taller con ID ${updateComposturaDto.workshopId} no encontrado`,
          );
        }

        compostura.workshop = workshop;
      }
    }

    if (updateComposturaDto.composturaTypeId !== undefined) {
      if (updateComposturaDto.composturaTypeId === null) {
        compostura.composturaType = null;
        compostura.composturaTypeId = null;
      } else {
        const ct = await this.composturaTypeRepository.findOne({
          where: { id: updateComposturaDto.composturaTypeId },
        });
        if (!ct) throw new NotFoundException('Tipus de compostura no trobat');
        compostura.composturaType = ct;
        compostura.composturaTypeId = ct.id;
      }
    }

    // Validar paymentOnAccount <= pvp
    const pvp = updateComposturaDto.pvp ?? compostura.pvp;
    const paymentOnAccount =
      updateComposturaDto.paymentOnAccount ?? compostura.paymentOnAccount;

    if (paymentOnAccount > pvp) {
      throw new BadRequestException(
        'El pago a cuenta no puede ser mayor que el PVP',
      );
    }

    // Actualizar otros campos
    Object.assign(compostura, {
      code: updateComposturaDto.code ?? compostura.code,
      description: updateComposturaDto.description ?? compostura.description,
      workToDo: updateComposturaDto.workToDo ?? compostura.workToDo,
      entryDate: updateComposturaDto.entryDate
        ? new Date(updateComposturaDto.entryDate)
        : compostura.entryDate,
      deliveryToWorkshopDate: updateComposturaDto.deliveryToWorkshopDate
        ? new Date(updateComposturaDto.deliveryToWorkshopDate)
        : updateComposturaDto.deliveryToWorkshopDate === null
          ? null
          : compostura.deliveryToWorkshopDate,
      exitFromWorkshopDate: updateComposturaDto.exitFromWorkshopDate
        ? new Date(updateComposturaDto.exitFromWorkshopDate)
        : updateComposturaDto.exitFromWorkshopDate === null
          ? null
          : compostura.exitFromWorkshopDate,
      deliveryToClientDate: updateComposturaDto.deliveryToClientDate
        ? new Date(updateComposturaDto.deliveryToClientDate)
        : updateComposturaDto.deliveryToClientDate === null
          ? null
          : compostura.deliveryToClientDate,
      cost: updateComposturaDto.cost ?? compostura.cost,
      pvp: pvp,
      paymentOnAccount: paymentOnAccount,
      photo: updateComposturaDto.photo ?? compostura.photo,
    });

    return this.composturaRepository.save(compostura);
  }

  async remove(id: string): Promise<void> {
    const compostura = await this.findOne(id);
    await this.composturaRepository.remove(compostura);
  }

  async search(searchDto: SearchComposturaDto): Promise<Compostura[]> {
    const queryBuilder = this.composturaRepository
      .createQueryBuilder('compostura')
      .leftJoinAndSelect('compostura.client', 'client')
      .leftJoinAndSelect('compostura.workshop', 'workshop');

    if (searchDto.code) {
      queryBuilder.andWhere('compostura.code LIKE :code', {
        code: `%${searchDto.code}%`,
      });
    }

    if (searchDto.clientId) {
      queryBuilder.andWhere('compostura.client.id = :clientId', {
        clientId: searchDto.clientId,
      });
    }

    if (searchDto.workshopId) {
      queryBuilder.andWhere('compostura.workshop.id = :workshopId', {
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
        'compostura.entryDate BETWEEN :entryDateFrom AND :entryDateTo',
        {
          entryDateFrom: searchDto.entryDateFrom,
          entryDateTo: searchDto.entryDateTo,
        },
      );
    } else if (searchDto.entryDateFrom) {
      queryBuilder.andWhere('compostura.entryDate >= :entryDateFrom', {
        entryDateFrom: searchDto.entryDateFrom,
      });
    } else if (searchDto.entryDateTo) {
      queryBuilder.andWhere('compostura.entryDate <= :entryDateTo', {
        entryDateTo: searchDto.entryDateTo,
      });
    }

    if (searchDto.deliveryToClientDateFrom && searchDto.deliveryToClientDateTo) {
      queryBuilder.andWhere(
        'compostura.deliveryToClientDate BETWEEN :deliveryToClientDateFrom AND :deliveryToClientDateTo',
        {
          deliveryToClientDateFrom: searchDto.deliveryToClientDateFrom,
          deliveryToClientDateTo: searchDto.deliveryToClientDateTo,
        },
      );
    } else if (searchDto.deliveryToClientDateFrom) {
      queryBuilder.andWhere(
        'compostura.deliveryToClientDate >= :deliveryToClientDateFrom',
        {
          deliveryToClientDateFrom: searchDto.deliveryToClientDateFrom,
        },
      );
    } else if (searchDto.deliveryToClientDateTo) {
      queryBuilder.andWhere(
        'compostura.deliveryToClientDate <= :deliveryToClientDateTo',
        {
          deliveryToClientDateTo: searchDto.deliveryToClientDateTo,
        },
      );
    }

    queryBuilder
      .orderBy('compostura.entryDate', 'DESC')
      .addOrderBy('compostura.createdAt', 'DESC');

    return queryBuilder.getMany();
  }
}

