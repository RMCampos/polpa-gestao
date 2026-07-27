import { describe, it, expect } from 'vitest';
import type { Customer, CustomerPOS } from '../types';

function filterCustomers(customers: Customer[], filterText: string): Customer[] {
  const normalizedFilter = filterText.trim().toLowerCase();
  if (!normalizedFilter) return customers;
  const digits = normalizedFilter.replace(/\D/g, '');
  const isPhoneSearch = /^\d+$/.test(normalizedFilter) && digits.length >= 3;

  const addressFilterMatches = (pos: CustomerPOS[] | undefined, text: string): boolean => {
    if (pos && Array.isArray(pos)) {
      const normalizedText = text.toLowerCase();
      for (let i = 0; i < pos.length; i++) {
        const normalizedAddress = pos[i].address
          .replace(/á/g, 'a')
          .replace(/ã/g, 'a')
          .replace(/â/g, 'a')
          .replace(/ê/g, 'e')
          .replace(/é/g, 'e')
          .replace(/ó/g, 'o')
          .replace(/ú/g, 'u')
          .replace(/ç/g, 'c')
          .toLowerCase();
        if (normalizedAddress.includes(normalizedText)) {
          return true;
        }
      }
    }
    return false;
  };

  return customers.filter((c: Customer) =>
    c.name.toLowerCase().includes(normalizedFilter) ||
    (c.personName && c.personName.toLowerCase().includes(normalizedFilter)) ||
    (isPhoneSearch && c.phone && c.phone.replace(/\D/g, '').includes(digits)) ||
    addressFilterMatches(c.pos, normalizedFilter)
  );
}

describe('Customer name filter', () => {
  const customers: Customer[] = [
    {
      name: 'Bakery 3 st',
      phone: '1234567890',
      pos: [],
    },
    {
      name: 'Bakery 4 st',
      phone: '9876543210',
      pos: [],
    },
    {
      name: 'Another Customer',
      phone: '1112223333',
      pos: [],
    },
  ];

  it('finds "Bakery 3 st" when typing a single word', () => {
    expect(filterCustomers(customers, 'Bakery')).toHaveLength(2);
  });

  it('finds "Bakery 3 st" when typing a space followed by a number', () => {
    expect(filterCustomers(customers, ' 3')).toHaveLength(1);
    expect(filterCustomers(customers, ' 3')[0].name).toBe('Bakery 3 st');
  });

  it('finds "Bakery 3 st" when typing the full name with spaces', () => {
    expect(filterCustomers(customers, 'Bakery 3 st')).toHaveLength(1);
    expect(filterCustomers(customers, 'Bakery 3 st')[0].name).toBe('Bakery 3 st');
  });

  it('finds "Bakery 3 st" when typing trailing spaces', () => {
    expect(filterCustomers(customers, '  Bakery 3 st  ')).toHaveLength(1);
    expect(filterCustomers(customers, '  Bakery 3 st  ')[0].name).toBe('Bakery 3 st');
  });

  it('returns all customers when filter is only spaces', () => {
    expect(filterCustomers(customers, '   ')).toHaveLength(3);
  });
});
