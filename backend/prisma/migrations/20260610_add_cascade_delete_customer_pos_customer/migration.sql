-- DropForeignKey
ALTER TABLE "CustomerPos" DROP CONSTRAINT "CustomerPos_customerId_fkey";

-- DropForeignKey
ALTER TABLE "RouteCustomerPos" DROP CONSTRAINT "RouteCustomerPos_customerPosId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_customerPosId_fkey";

-- DropForeignKey
ALTER TABLE "SaleProduct" DROP CONSTRAINT "SaleProduct_saleId_fkey";

-- AddForeignKey
ALTER TABLE "CustomerPos" ADD CONSTRAINT "CustomerPos_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerPosId_fkey" FOREIGN KEY ("customerPosId") REFERENCES "CustomerPos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleProduct" ADD CONSTRAINT "SaleProduct_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteCustomerPos" ADD CONSTRAINT "RouteCustomerPos_customerPosId_fkey" FOREIGN KEY ("customerPosId") REFERENCES "CustomerPos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
