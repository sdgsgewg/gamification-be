import { Controller, Get, Query } from '@nestjs/common';
import { RoleService } from './roles.service';
import { FilterRoleDto } from './dto/requests/filter-role.dto';

@Controller('/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('')
  async getAllRoles(@Query() filterDto: FilterRoleDto) {
    return this.roleService.findAllRoles(filterDto);
  }
}
