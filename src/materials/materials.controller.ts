import {
  Controller,
  Query,
  Get,
  Post,
  Put,
  Delete,
  Param,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { MaterialService } from './materials.service';
import { FilterMaterialDto } from './dto/requests/filter-material.dto';
import { CreateMaterialDto } from './dto/requests/create-material.dto';
import { UpdateMaterialDto } from './dto/requests/update-material.dto';

@Controller('/materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get('')
  async getAllMaterials(@Query() filterDto: FilterMaterialDto) {
    return this.materialService.findAllMaterials(filterDto);
  }

  @Get(':slug')
  async getMaterialDetail(@Param('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('Material slug is required');
    }
    return this.materialService.findMaterialBySlug(slug);
  }

  @Post()
  async create(@Body() dto: CreateMaterialDto) {
    return this.materialService.createMaterial(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialService.updateMaterial(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.materialService.deleteMaterial(id);
  }
}
