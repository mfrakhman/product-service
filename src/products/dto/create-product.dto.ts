import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'Product name must not be empty' })
  name: string;

  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be greater than zero' })
  price: number;

  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0, { message: 'Quantity cannot be negative' })
  qty: number;
}
