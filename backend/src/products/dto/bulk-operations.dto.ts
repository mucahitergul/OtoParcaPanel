import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class BulkSyncDto {
  @IsArray()
  @IsNumber({}, { each: true })
  productIds: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  batchSize?: number = 50;
}

export class BulkDeleteDto {
  @IsArray()
  @IsNumber({}, { each: true })
  productIds: number[];
}

export class BulkPriceUpdateDto {
  @IsArray()
  @IsNumber({}, { each: true })
  productIds: number[];

  @IsEnum([
    'fixed',
    'percentage_increase',
    'percentage_decrease',
    'amount_increase',
    'amount_decrease',
  ])
  updateType:
    | 'fixed'
    | 'percentage_increase'
    | 'percentage_decrease'
    | 'amount_increase'
    | 'amount_decrease';

  @IsNumber()
  @Min(0)
  value: number;
}

export class BulkStockUpdateDto {
  @IsArray()
  @IsNumber({}, { each: true })
  productIds: number[];

  @IsEnum(['fixed', 'increase', 'decrease'])
  updateType: 'fixed' | 'increase' | 'decrease';

  @IsNumber()
  @Min(0)
  value: number;
}

export class BulkExportDto {
  @IsArray()
  @IsNumber({}, { each: true })
  productIds: number[];

  @IsEnum(['csv', 'excel', 'pdf'])
  format: 'csv' | 'excel' | 'pdf';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  includeImages?: boolean = false;
}

export class BulkOperationResultDto {
  success: boolean;
  message: string;
  processedCount?: number;
  failedCount?: number;
  errors?: Array<{
    productId: number;
    error: string;
  }>;
  downloadUrl?: string; // For export operations
  data?: any; // For additional operation data
}
