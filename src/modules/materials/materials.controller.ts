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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { MaterialService } from './materials.service';
import { FilterMaterialDto } from './dto/requests/filter-material.dto';
import { CreateMaterialDto } from './dto/requests/create-material.dto';
import { UpdateMaterialDto } from './dto/requests/update-material.dto';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

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
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') rawData: string,
  ) {
    try {
      const dto: CreateMaterialDto = JSON.parse(rawData);

      let cover: Express.Multer.File | undefined;
      if (file.fieldname === 'imageFile') {
        cover = file;
      }

      return this.materialService.createMaterial(dto, cover);
    } catch (e) {
      console.error('Error create material:', e);
      throw e;
    }
  }

  @Put(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() rawData: string,
  ) {
    try {
      const dto: UpdateMaterialDto = JSON.parse(rawData);

      let cover: Express.Multer.File | undefined;
      if (file.fieldname === 'imageFile') {
        cover = file;
      }

      return this.materialService.updateMaterial(id, dto, cover);
    } catch (e) {
      console.error('Error update material:', e);
      throw e;
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.materialService.deleteMaterial(id);
  }
}
