import { Role } from "discord.js";
import { RoleOption } from "necord";

export class AutoRoleDto {
  @RoleOption({ 
    name: 'role', 
    description: 'The Role to assign automatically', 
    required: true 
  })
  role: Role;
}