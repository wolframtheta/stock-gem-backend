import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SearchSupplierDto } from './dto/search-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Verificar si el NIF ya existe
    const existingSupplier = await this.supplierRepository.findOne({
      where: { nif: createSupplierDto.nif },
    });

    if (existingSupplier) {
      throw new ConflictException('El proveedor con este NIF ya existe');
    }

    const supplier = this.supplierRepository.create(createSupplierDto);
    return this.supplierRepository.save(supplier);
  }

  async findAll(): Promise<Supplier[]> {
    return this.supplierRepository.find({
      order: { surname: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({ where: { id } });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id);

    // Si se actualiza el NIF, verificar que no exista otro con el mismo NIF
    if (updateSupplierDto.nif && updateSupplierDto.nif !== supplier.nif) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: { nif: updateSupplierDto.nif },
      });

      if (existingSupplier) {
        throw new ConflictException('El proveedor con este NIF ya existe');
      }
    }

    Object.assign(supplier, updateSupplierDto);

    return this.supplierRepository.save(supplier);
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);
  }

  async search(searchDto: SearchSupplierDto): Promise<Supplier[]> {
    const queryBuilder =
      this.supplierRepository.createQueryBuilder('supplier');

    if (searchDto.name) {
      queryBuilder.andWhere(
        '(supplier.name ILIKE :name OR supplier.surname ILIKE :name)',
        {
          name: `%${searchDto.name}%`,
        },
      );
    }

    if (searchDto.phone) {
      queryBuilder.andWhere('supplier.phones ILIKE :phone', {
        phone: `%${searchDto.phone}%`,
      });
    }

    queryBuilder.orderBy('supplier.surname', 'ASC');
    queryBuilder.addOrderBy('supplier.name', 'ASC');

    return queryBuilder.getMany();
  }
}

