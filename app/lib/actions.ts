'use server'; // Đánh dấu các hàm được xuất trong file này là hành động máy chủ - Action Server
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({ invalid_type_error: 'Please select a customer' }),
  amount: z.coerce.number().gt(0, { message: 'Please entern a amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status'
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
export type State = {
  errors?: {
    customerId?: string[],
    amount?: string[],
    status?: string[],
  };
  message?: string | null;
}

export async function createInvoice(preState: State, formData: FormData) {
  const validateFieds = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  });
  if (!validateFieds.success) {
    return {
      errors: validateFieds.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoices.',
    }
  }
  const { customerId, amount, status } = validateFieds.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  try {
    await sql`
  INSERT INTO invoices (customer_id, amount, status, date)
  VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
`;
  } catch (error) {
    return {
      message: 'Database Error: Failed To Create Invoice'
    }
  }
  revalidatePath('/dashboard/invoices') //Tải lại trang - làm mới dữ liệu vì nextjs sẽ tải trước trang khi người dùng bấm 
  redirect('/dashboard/invoices') //Chuyển hướng trang
}
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const validateFieds = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  });
  if (!validateFieds.success) {
    return {
      errors: validateFieds.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoices.',
    }
  }
  const { customerId, amount, status } = validateFieds.data;
  const amountInCents = amount * 100;
  try {
    await sql`
  UPDATE invoices
  SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
  WHERE id = ${id}
`;
  } catch (error) {
    return {
      message: 'Database Error : Failed To Update Invoice'
    }
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices')
    return { message: 'Delete Invoice' }
  } catch (error) {
    return {
      message: 'Database Error: Failed To Delte Invoice'
    }
  }
}