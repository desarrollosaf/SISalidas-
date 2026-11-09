import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** La forma de los datos; las reglas del negocio están en common/reglas.ts. */
export class CrearPermisoDto {
  @IsDateString()
  fecha_permiso: string;

  @Matches(HORA, { message: 'La hora de salida no es válida' })
  hora_salida: string;

  @IsBoolean()
  regresa: boolean;

  @IsOptional()
  @Matches(HORA, { message: 'La hora de regreso no es válida' })
  hora_regreso?: string | null;

  @IsIn([1, 2, 3], { message: 'Selecciona el tipo de permiso' })
  tipo_permiso: number;

  @IsOptional()
  @IsInt()
  origen?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  destinos?: number[];

  /** destinos.otroDestino es varchar(100) en la base. */
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El otro destino debe tener máximo 100 caracteres' })
  otro?: string | null;
}
