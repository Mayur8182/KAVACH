import { redirect } from 'next/navigation';

export default function LegacyCodeRepositoriesRedirect() {
  redirect('/repositories');
}
