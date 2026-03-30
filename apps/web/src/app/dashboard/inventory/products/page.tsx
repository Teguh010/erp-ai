import { redirect } from 'next/navigation';

export default function ProductsIndexPage() {
  redirect('/dashboard/inventory/products/finished');
}
