export class ValidateSaleItemDto {
    productVariantId: string;
    quantity: number; // For future volume rules
    modifiers?: {
        selectedProteins?: string[];
        removedIngredients?: string[];
    };
}
