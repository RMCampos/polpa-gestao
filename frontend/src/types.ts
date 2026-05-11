/* Dashboard page types */
export type SalesByCustomer = {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalAmount: number;
}

export type SalesByProduct = {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
}

export type SalesSummary = {
  totalSales: number;
  totalAmount: number;
  averageAmount: number;
}

/* Users page types */
export type User = {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  disabledAt?: string | null;
};

/* Customers page types */
export type CustomerPOS = {
  id?: string;
  customerId?: string;
  address: string;
  phone: string;
  personName?: string;
  fridgeCount?: number;
  customer?: Customer;
}

export type Customer = {
  id?: string;
  name: string;
  document?: string;
  phone: string;
  personName?: string;
  pos?: CustomerPOS[];
  disabledAt?: string | null;
};

/* Product page types */
export type Product = {
  id?: string;
  name: string;
  price: number;
  stock: number;
  cost: number;
  disabledAt?: string | null;
};

/* Routes page types */
export type CustomerPOSRoute = {
  routeId: string;
  customerPosId: string;
  customerPos: CustomerPOS;
}
export type Route = {
  id?: string;
  name: string;
  completed: boolean;
  dayOfWeek: number;
  customerPos?: CustomerPOS[];
};

/* Sales page types */
export type SaleProduct = {
  saleId: string;
  productId: string;
  quantity: number;
  product?: Product;
};

export type Sale = {
  id?: string;
  customerPosId: string;
  delivered: boolean;
  paymentMethod: string;
  paymentDueDate: string | null;
  paymentDate: string | null;
  comments: string;
  createdAt: string;
  customerPos?: CustomerPOS;
  products?: SaleProduct[];
}
